//! Integração com a área de trabalho: janela, bandeja e notificações (spec 005).

use crate::error::{AppError, AppResult};
use crate::reminder::Reminder;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

pub const MAIN_WINDOW: &str = "main";
/// Argumento usado ao iniciar com o sistema: sobe direto na bandeja.
pub const MINIMIZED_ARG: &str = "--minimized";

const MENU_OPEN: &str = "open";
const MENU_QUIT: &str = "quit";

/// `true` quando o ícone da bandeja existe. Sem ele, fechar a janela precisa
/// encerrar o app de verdade — senão não haveria como sair.
#[derive(Default)]
pub struct TrayState(pub AtomicBool);

/// Mostra e foca a janela principal, na Home.
pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.eval("window.location.hash = '#/'");
    }
}

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, MENU_OPEN, "Abrir Duo Code", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, MENU_QUIT, "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("Duo Code")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_OPEN => show_main_window(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    app.state::<TrayState>().0.store(true, Ordering::Relaxed);
    Ok(())
}

/// Fechar a janela só a esconde quando há bandeja para trazê-la de volta.
pub fn on_close_requested(window: &tauri::Window, api: &tauri::CloseRequestApi) {
    if window.state::<TrayState>().0.load(Ordering::Relaxed) {
        api.prevent_close();
        let _ = window.hide();
    }
}

/// Envia uma notificação do sistema. No Linux, clicar nela abre o app.
pub fn notify(app: &AppHandle, reminder: &Reminder) -> AppResult<()> {
    let mut notification = notify_rust::Notification::new();
    notification
        .appname("Duo Code")
        .summary(&reminder.title)
        .body(&reminder.body);

    #[cfg(target_os = "linux")]
    {
        notification.icon("duo-code").action("default", "Abrir");
        let handle = notification
            .show()
            .map_err(|e| AppError::new("notification", e.to_string()))?;
        let app = app.clone();
        // Espera pelo clique fora da thread de quem chamou.
        std::thread::spawn(move || {
            handle.wait_for_action(|action| {
                if action == "default" {
                    show_main_window(&app);
                }
            });
        });
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        notification
            .show()
            .map_err(|e| AppError::new("notification", e.to_string()))?;
    }
    Ok(())
}
