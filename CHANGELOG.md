# Changelog

All notable changes to the Bizbize project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-06

### Added
- **Global Sinyalleşme Altyapısı**: Kullanıcı oturum açtığında arka planda otomatik olarak WebSocket bağlantısı kurularak gelen aramalar (`offer`) anında yakalanabilir hale getirildi.
- **Canlı Yayın Davet/Katılım Sistemi**: Kullanıcı ekran paylaşımı/canlı yayın başlattığında, sohbette otomatik olarak "Yayına Katıl" butonu içeren şifreli bir davet kartı gönderilmesi sağlandı.

### Changed
- **Arama Akışı Optimizasyonu (Başkanın Kuralları)**: Tarayıcı izinleri ve uyarıları minimize edilerek, gelen aramalarda alıcı onay verene kadar kamera/mikrofon erişimi geciktirildi.

## [1.0.0] - 2026-06-03

### Added
- **Kişiler (Contacts) Ekranı**: Yeni kişi ekleme, kişiler listesinde arama yapma ve seçilen kişiyle sohbet başlatma özellikleri eklendi.
- **index.css Dosyası**: Uygulamaya özel premium animasyonlar (`pulse-glow`, `float`, `slide-up`, `slide-in`), özel kaydırma çubukları ve safe-area ayarları entegre edildi.
- **Resim Eki Gönderme**: Galeri aracılığıyla resim seçebilme, resme açıklama (caption) yazabilme ve sohbette görseli şık bir kart şeklinde görüntüleyebilme desteği eklendi.
- **Yapay Zeka Hata Toleransı**: Gemini API anahtarı girilmediğinde veya API isteklerinde hata oluştuğunda uygulamanın çökmesini engelleyen dinamik çevrimdışı asistan simülatörü eklendi.

### Changed
- **Türkçe Yerelleştirme**: Tüm navigasyon barı, arama ekranları, durum ifadeleri ve güvenlik bildirimleri Türkçe diline yerelleştirildi.
- **Arama Ekranı (Calling Screen)**: Sesli ve görüntülü aramalardaki bağlantı animasyonları, durum bildirimleri ve geçici anahtar imha görsel efektleri zenginleştirildi.
- **Profil Düzenleme**: Ayarlar sekmesinde localStorage destekli etkileşimli ad, telefon numarası ve durum mesajı düzenleyici entegre edildi.
