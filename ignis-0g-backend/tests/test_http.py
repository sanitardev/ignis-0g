import asyncio
import importlib
import json
import httpx
import pytest
from app.main import app, rate_windows


def test_http_contract(monkeypatch):
    from app.ai.service import insufficient_evidence

    async def assistant_stub(request):
        return insufficient_evidence()

    monkeypatch.setattr(importlib.import_module('app.main'), 'ask', assistant_stub)
    monkeypatch.setattr(importlib.import_module('app.main'), 'ASSISTANT_REQUESTS_PER_MINUTE', 15)
    async def run():
        rate_windows.clear()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test',headers={'Origin':'http://localhost:5173'}) as client:
            for method,path,body,status in [('GET','/missing',None,404),('POST','/health',None,405),('GET','/api/v1/studies?limit=0',None,422),('POST','/api/v1/assistant/chat',{'message':'  '},422),('POST','/api/v1/assistant/chat',{'message':'hi','scope':'study'},422),('POST','/api/v1/assistant/compare',{'study_ids':['a','a']},422)]:
                r=await client.request(method,path,json=body)
                assert r.status_code==status, r.text
                assert r.json()['error']['request_id']==r.headers['x-request-id']
                assert r.headers['access-control-allow-origin']=='http://localhost:5173'
            r=await client.post('/api/v1/assistant/chat',content=b'x'*32769)
            assert r.status_code==413
            rate_windows.clear()
            for _ in range(15):
                assert (await client.post('/api/v1/assistant/chat',json={'message':'hi'})).status_code==200
            r=await client.post('/api/v1/assistant/chat/stream',json={'message':'hi'})
            assert r.status_code==429 and int(r.headers['retry-after'])>0
            rate_windows.clear()
            r=await client.options('/api/v1/studies',headers={'Access-Control-Request-Method':'GET'})
            assert r.status_code==200 and 'x-request-id' in r.headers
            async def broken(*args):
                raise RuntimeError('secret internal detail')
            monkeypatch.setattr(importlib.import_module('app.repositories.catalog'),'filters',broken)
            r=await client.get('/api/v1/catalog/filters')
            assert r.status_code==500 and 'secret' not in r.text
    asyncio.run(run())


@pytest.mark.parametrize('timeout', [False, True])
def test_chat_event_stream(monkeypatch, timeout):
    from app.ai.providers import ProviderTimeout
    from app.ai.service import insufficient_evidence

    main = importlib.import_module('app.main')

    async def ask_stub(payload):
        if timeout:
            raise ProviderTimeout()
        return insufficient_evidence(payload.message)

    monkeypatch.setattr(main, 'ask', ask_stub)
    monkeypatch.setattr(main, 'rate_windows', {})

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            invalid = await client.post('/api/v1/assistant/chat/stream', json={'message': ' '})
            assert invalid.status_code == 422
            response = await client.post('/api/v1/assistant/chat/stream', json={'message': 'Explain results'})
        assert response.status_code == 200
        assert response.headers['content-type'].startswith('text/event-stream')
        assert response.headers['x-accel-buffering'] == 'no'
        events = {}
        for block in response.text.replace('\r\n', '\n').strip().split('\n\n'):
            fields = dict(line.split(': ', 1) for line in block.splitlines())
            events[fields['event']] = json.loads(fields['data'])
        assert events['accepted']['request_id'] == response.headers['x-request-id']
        if timeout:
            assert list(events) == ['accepted', 'error']
            assert events['error']['error']['code'] == 'AI_TIMEOUT'
        else:
            assert list(events) == ['accepted', 'result']
            assert events['result']['status'] == 'insufficient_evidence'

    asyncio.run(run())


@pytest.mark.parametrize(('message', 'expected_status', 'greeting'), [
    ('Привет!', 200, 'Привет!'),
    ('Hello.', 200, 'Hello!'),
    ('Привет, что изучали в FLEX-1?', 504, None),
])
def test_chat_with_unresponsive_model(monkeypatch, message, expected_status, greeting):
    from contextlib import asynccontextmanager

    from app.ai import service
    from app.ai.providers import ProviderTimeout

    @asynccontextmanager
    async def unavailable(*args):
        raise ProviderTimeout()
        yield

    monkeypatch.setattr(service, 'configured_providers', unavailable)
    monkeypatch.setattr(importlib.import_module('app.main'), 'rate_windows', {})

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            response = await client.post('/api/v1/assistant/chat', json={'message': message})
            assert response.status_code == expected_status
            result = response.json()
            if greeting:
                assert result['status'] == 'answered'
                assert result['answer'].startswith(greeting)
                assert result['citations'] == []
            else:
                assert result['error']['code'] == 'AI_TIMEOUT'

    asyncio.run(run())


@pytest.mark.parametrize('payload',[
    {'message':'a','history':[{'role':'system','content':'a'}]},
    {'message':'a','history':[{'role':'user','content':'x'*2000}]*7},
    {'message':'a'*2001},
])
def test_chat_validation(payload):
    from app.schemas.assistant import ChatRequest
    with pytest.raises(ValueError):
        ChatRequest.model_validate(payload)
