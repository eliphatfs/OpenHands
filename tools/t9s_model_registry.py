"""Register t9s models into litellm's model_cost registry.

Auto-loaded at Python interpreter startup via the sibling `t9s_model_registry.pth`
(site import). t9s (coding.sudoai.cc/v1) is a custom OpenAI-compatible provider
that litellm doesn't know about; this declares its real capabilities so
OpenHands can detect vision support and the correct context window. Only the
capability LOOKUP table changes — the actual API request still sends the real
model name to the t9s endpoint.

This is the SINGLE source of truth for t9s model capabilities. Edit the values
here, then restart the python interpreter (agent-server) so the .pth re-runs.
Unconditional assignment (no `if name not in` guard) so edits always propagate.
"""

import litellm

_GEMMA4 = {
    "supports_vision": True,
    "supports_function_calling": True,
    "supports_parallel_function_calling": True,
    "supports_system_messages": True,
    "supports_prompt_caching": False,
    "litellm_provider": "openai",
    "max_input_tokens": 200000,
    "max_output_tokens": 50000,
    "max_tokens": 50000,
    "mode": "chat",
}

_GLM52 = {
    "supports_vision": False,
    "supports_function_calling": True,
    "supports_parallel_function_calling": True,
    "supports_system_messages": True,
    "supports_prompt_caching": False,
    "litellm_provider": "openai",
    "max_input_tokens": 350000,
    "max_output_tokens": 100000,
    "max_tokens": 100000,
    "mode": "chat",
}

for _name in ("openai/t9s/gemma-4", "t9s/gemma-4"):
    litellm.model_cost[_name] = dict(_GEMMA4)
for _name in ("openai/t9s/glm-5.2", "t9s/glm-5.2"):
    litellm.model_cost[_name] = dict(_GLM52)
