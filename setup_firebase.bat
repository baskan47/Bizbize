@echo off
chcp 65001 > nul
echo ===================================================
echo   bizbize - Firebase Otomatik Yapılandırma Sihirbazı
echo ===================================================
echo.
echo Bu sihirbaz Firebase hesabınıza giriş yapacak, yeni bir proje oluşturacak
echo ve uygulamanızın ayarlarını otomatik olarak yapılandıracaktır.
echo.
echo Lütfen adımları takip edin...
echo.
pause

echo.
echo 1. Adım: Firebase Girişi yapılıyor...
echo Tarayıcı penceresi açıldığında lütfen giriş yapın.
echo.
call npx firebase login
if errorlevel 1 (
    echo [HATA] Firebase girişi başarısız oldu.
    pause
    exit /b
)

echo.
echo 2. Adım: Firebase Projesi Oluşturuluyor...
set /p PROJ_ID="Oluşturulacak proje kimliğini (Project ID) girin (örn: bizbize-sohbet-%random%): "
call npx firebase projects:create %PROJ_ID% --title "bizbize Sohbet Uygulaması"
if errorlevel 1 (
    echo [HATA] Proje oluşturulamadı. Belki bu proje kimliği zaten alınmıştır.
    pause
    exit /b
)

echo.
echo 3. Adım: Firebase Uygulaması ve Firestore Yapılandırılıyor...
call npx firebase apps:create web "bizbize-web" --project %PROJ_ID%
if errorlevel 1 (
    echo [UYARI] Web uygulaması oluşturulamadı veya zaten var.
)

echo.
echo Proje ve Uygulama bilgileri başarıyla oluşturuldu!
echo Lütfen Firebase Konsolu'ndan (https://console.firebase.google.com/project/%PROJ_ID%/settings/general/)
echo Web Uygulaması ayarlarını alıp .env.local dosyanıza girin.
echo.
echo Sihirbaz tamamlandı.
pause
