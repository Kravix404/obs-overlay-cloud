obs = obslua

local server_path = ""
local public_url = "http://localhost:3000/control.html"

function script_description()
    return "Запускает локальный сервер для удаленного управления оверлеем и выдает ссылку для подключения."
end

function script_properties()
    local props = obs.obs_properties_create()
    obs.obs_properties_add_path(props, "server_file", "Путь к server.js", obs.OBS_PATH_FILE, "JavaScript (*.js)", nil)
    obs.obs_properties_add_button(props, "start_btn", "Запустить сервер", start_server)
    obs.obs_properties_add_text(props, "obs_url", "1. Вставьте это в Browser Source (OBS):", obs.OBS_TEXT_DEFAULT)
    obs.obs_properties_add_text(props, "remote_url", "2. Локальная ссылка для пульта:", obs.OBS_TEXT_DEFAULT)
    return props
end

function script_defaults(settings)
    obs.obs_data_set_default_string(settings, "obs_url", "http://localhost:3000/overlay.html")
    obs.obs_data_set_default_string(settings, "remote_url", "http://localhost:3000/control.html")
end

function script_update(settings)
    server_path = obs.obs_data_get_string(settings, "server_file")
end

function start_server(props, prop)
    if server_path ~= "" then
        -- Запускаем node server.js в фоновом окне (для Windows)
        os.execute('start "" node "' .. server_path .. '"')
        obs.script_log(obs.LOG_INFO, "Сервер оверлея запущен!")
    else
        obs.script_log(obs.LOG_WARNING, "Сначала выберите файл server.js!")
    end
end