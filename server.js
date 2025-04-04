const express = require("express");
const app = express();
const path = require("path");

// Proje kök dizinindeki tüm dosyaları statik olarak sun (lang/ klasörü dahil)
app.use(express.static(path.join(__dirname, '.')));

// `public` klasöründeki dosyaları statik olarak sun (isteğe bağlı, eğer kullanıyorsan)
app.use(express.static(path.join(__dirname, "public")));

// Kök yol için index.html dosyasını sun
app.get("/", (request, response) => {
    response.sendFile(path.join(__dirname, "views", "index.html"));
});

// SSS yolu için faq.html dosyasını sun
app.get("/SSS", (request, response) => {
    response.sendFile(path.join(__dirname, "views", "faq.html"));
});

// Örnek dreams verisi
const dreams = [
    "Find and count some sheep",
    "Climb a really tall mountain",
    "Wash the dishes"
];

app.get("/dreams", (request, response) => {
    response.json(dreams);
});

// Eşleşmeyen tüm istekler için 404.html dosyasını sun (en sona koyuyoruz)
app.get("*", (request, response) => {
    response.sendFile(path.join(__dirname, "views", "404.html"));
});

// Sunucuyu başlat
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});