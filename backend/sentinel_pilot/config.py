from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SentinelPilot"
    database_url: str = "sqlite:///./sentinel_pilot.db"

    im_provider: str = "dingtalk"
    im_notification_enabled: bool = False
    dingtalk_webhook_url: str = ""
    dingtalk_secret: str = ""
    dingtalk_client_id: str = ""
    dingtalk_client_secret: str = ""
    dingtalk_robot_code: str = ""
    dingtalk_open_conversation_id: str = ""
    dingtalk_card_template_id: str = ""
    dingtalk_card_callback_url: str = ""
    dingtalk_card_callback_secret: str = ""
    public_app_url: str = "http://localhost:3000"

    llm_enabled: bool = False
    llm_provider: str = "mock"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_temperature: float = 0.2
    llm_timeout_seconds: int = 30
    llm_prompt_profile: str = "default"
    llm_action_mode: str = "approval_required"
    llm_allow_high_risk_actions: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
