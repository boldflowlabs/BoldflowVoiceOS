from types import SimpleNamespace
from unittest.mock import patch

from api.services.configuration.check_validity import UserConfigurationValidator
from api.services.configuration.options.rumik import (
    RUMIK_TTS_DEFAULT_DESCRIPTION,
    RUMIK_TTS_DEFAULT_GATEWAY_URL,
    RUMIK_TTS_MODELS,
    RUMIK_TTS_VOICES,
)
from api.services.configuration.registry import (
    RumikTTSConfiguration,
    ServiceProviders,
)
from api.services.pipecat.service_factory import create_tts_service


def test_rumik_tts_configuration_defaults():
    config = RumikTTSConfiguration(api_key="rk_test_key_123")

    assert config.provider == ServiceProviders.RUMIK
    assert config.model == "mulberry"
    assert config.voice == "ira"
    assert config.gateway_url == RUMIK_TTS_DEFAULT_GATEWAY_URL
    assert config.description == RUMIK_TTS_DEFAULT_DESCRIPTION
    assert config.temperature == 0.6
    assert config.top_p == 0.95
    assert config.top_k == 50
    assert config.repetition_penalty == 1.2
    assert config.max_new_tokens == 2048
    assert "mulberry" in RUMIK_TTS_MODELS
    assert "muga" in RUMIK_TTS_MODELS
    assert "ira" in RUMIK_TTS_VOICES
    assert "siya" in RUMIK_TTS_VOICES


def test_create_rumik_tts_service_mulberry():
    user_config = SimpleNamespace(
        tts=SimpleNamespace(
            provider=ServiceProviders.RUMIK.value,
            api_key="rk_test_12345",
            model="mulberry",
            voice="siya",
            description="a warm friendly indian narrator",
            gateway_url="https://silk-api.rumik.ai",
            temperature=0.6,
            top_p=0.95,
            top_k=50,
            repetition_penalty=1.2,
            max_new_tokens=2048,
        )
    )
    audio_config = SimpleNamespace(
        transport_out_sample_rate=24000,
        transport_in_sample_rate=16000,
    )

    with patch("api.services.pipecat.service_factory.RumikTTSService") as mock_service:
        create_tts_service(user_config, audio_config)

    assert mock_service.call_count == 1
    kwargs = mock_service.call_args.kwargs
    assert kwargs["api_key"] == "rk_test_12345"
    assert kwargs["gateway_url"] == "https://silk-api.rumik.ai"
    assert kwargs["silence_time_s"] == 1.0


def test_create_rumik_tts_service_muga():
    user_config = SimpleNamespace(
        tts=SimpleNamespace(
            provider=ServiceProviders.RUMIK.value,
            api_key="rk_test_67890",
            model="muga",
            voice="ira",
            temperature=0.7,
            gateway_url="https://silk-api.rumik.ai",
        )
    )
    audio_config = SimpleNamespace(
        transport_out_sample_rate=24000,
        transport_in_sample_rate=16000,
    )

    with patch("api.services.pipecat.service_factory.RumikTTSService") as mock_service:
        create_tts_service(user_config, audio_config)

    assert mock_service.call_count == 1
    kwargs = mock_service.call_args.kwargs
    assert kwargs["api_key"] == "rk_test_67890"


def test_rumik_api_key_validator():
    validator = UserConfigurationValidator()
    assert validator._check_rumik_api_key(model="mulberry", api_key="rk_test") is True
