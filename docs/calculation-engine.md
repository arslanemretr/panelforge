# PanelForge Hesaplama Dokumani

Bu dokuman, PanelForge icindeki mevcut hesap motorunun bugun nasil calistigini aciklar. Icerik dogrudan backend implementasyonuna gore yazilmistir.

Ilgili kod:
- `backend/app/services/validation_service.py`
- `backend/app/services/calculation_service.py`
- `backend/app/api/calculations.py`

## 1. Hesaplama ne zaman calisir

Hesaplama `POST /api/projects/{project_id}/calculate` uzerinden tetiklenir.

Is akisi:
1. Once `validate_project(...)` calisir.
2. Eksik veri varsa hesaplama durur ve `400` doner.
3. Veri tam ise once eski busbar sonuclari temizlenir.
4. Ana bakir ve tali bakir parcalari yeniden uretilir.
5. Sonuclar `busbars`, `busbar_segments`, `busbar_holes`, `busbar_bends` tablolarina yazilir.
6. Ozet bilgi `GET /api/projects/{project_id}/results` ile okunur.

## 2. Validasyon mantigi

Hesaplama oncesinde su alanlar kontrol edilir:
- Proje var mi
- Pano kaydi var mi
- Montaj alani tanimli mi
- Faz sistemi girilmis mi
- Projeye yerlestirilmis cihaz var mi
- Her cihazin terminal bilgisi var mi
- Bakir ayarlari var mi
- Ana bakir olcusu var mi
- Tali bakir olcusu var mi
- Bukum ic yaricapi var mi
- Varsayilan delik capi var mi

Ek uyari:
- Birden fazla kabin varsa ve bir cihazin `project_panel_id` alani bos ise sistem uyari verir.
- Bu durumda cihaz ilk kabin referansi ile hesaplanir.

Not:
- Su an validasyon delik-kenar mesafesi, cihaz cakismasi veya pano disina tasma gibi ileri geometri kontrollerini tam yapmaz.

## 3. Hesapta kullanilan veri kaynaklari

Hesap motoru su kayitlari okur:
- `projects`
- `panels`
- `project_panels`
- `project_devices`
- `devices`
- `device_terminals`
- `copper_settings`

Bu verilerden su bilgiler kullanilir:
- Toplam pano genisligi ve yuksekligi
- Kabinlerin soldan saga sirasi
- Her kabinin sol, sag, ust, alt bosluklari
- Cihazin hangi kabinde oldugu
- Cihazin pano icindeki X/Y konumu
- Cihaz rotasyonu
- Cihaza ait faz terminal koordinatlari
- Ana ve tali bakir kesitleri
- Ana bakir yerlesim koordinatlari
- Faz araligi
- Delik capi ve bukum yaricapi

## 4. Koordinat sistemi

Backend hesap motoru su koordinat sistemini kullanir:
- Orijin: pano ic hacminin sol alt kosesi
- `X`: saga dogru artar
- `Y`: yukari dogru artar
- Birim: `mm`

Bu nokta onemli:
- Bazi ekranlarda kullaniciya farkli referanslar gosterilebilir.
- Ancak backend hesaplari icin cihaz ve terminal geometresi sol-alt orijinli ic koordinat sistemine donusturulur.

## 5. Coklu pano / kabin mantigi

Projede birden fazla kabin olabilir. Hesap motoru bunu su sekilde ele alir:

1. `project_panels` kayitlari `seq` sirasina gore soldan saga dizilir.
2. Her kabin icin bir global X ofseti uretilir.
3. Her kabinin kendi `left_margin_mm` ve `bottom_margin_mm` degerleri bu ofsete eklenir.
4. Boylece cihazin kabin ici lokal koordinati, tum pano dizilimi icindeki global koordinata tasinir.

Sonuc:
- Tali bakir hesaplari, cihazin bulundugu kabine gore dogru global konumdan uretilir.
- Ana bakir yerlesimi ise ilk kabinin ic referansindan baslatilir.

## 6. Cihaz terminal koordinati nasil bulunur

Her cihaz yerlesimi icin terminalin gercek konumu iki adimda bulunur.

### 6.1. Lokal cihaz ici terminal donusumu

Terminal koordinati once cihaz rotasyonuna gore duzeltilir.

Desteklenen durumlar:
- `0`
- `90`
- `180`
- `270`
- Diger acilar icin genel trigonometrik donusum

### 6.2. Kabin ve cihaz ofsetinin eklenmesi

Duzenlenmis terminal noktasi su degerlerle toplanir:
- cihazin kabin ici `x_mm`
- cihazin kabin ici `y_mm`
- kabinin global X ofseti
- kabinin alt bosluk ofseti

Boylece `terminal_world` elde edilir.

Bu nokta, tali bakirin cihaza baglanacagi gercek 2D noktadir.

## 7. Faz listesi nasil belirlenir

Faz listesi `panel.phase_system` alanindan gelir.

Eslemeler:
- `3P` -> `L1, L2, L3`
- `3P+N` -> `L1, L2, L3, N`
- `3P+N+PE` -> `L1, L2, L3, N, PE`

Sistem her faz icin ayri hesap yapar.

## 8. Ana bakir nasil uretilir

Her faz icin bir ana bakir parcasi uretilir. Ancak bu sadece o fazda en az bir cihaz terminali varsa yapilir.

Kullanilan alanlar:
- `copper_settings.busbar_x_mm`
- `copper_settings.busbar_y_mm`
- `copper_settings.busbar_length_mm`
- `copper_settings.busbar_orientation`
- `copper_settings.main_phase_spacing_mm`
- `copper_settings.main_width_mm`

### 8.1. Ana bakir ekseni

Ana bakir iki modda olabilir:
- `horizontal`
- `vertical`

Yatay durumda:
- Fazlar yukari dogru istiflenir.
- Her faz icin merkez `Y` farkli olur.
- Ana bakir `X` boyunca uzar.

Dikey durumda:
- Fazlar saga dogru istiflenir.
- Her faz icin merkez `X` farkli olur.
- Ana bakir `Y` boyunca uzar.

### 8.2. Ana bakir baslangic ve bitis noktasi

Hesap motoru her faz icin:
- bir baslangic noktasi
- bir bitis noktasi

olusturur ve bunu tek bir segment olarak kaydeder.

### 8.3. Ana bakir delikleri

Her cihaz terminalinin, ana bakir ekseni uzerindeki izdusus noktasinda bir baglanti noktasi olusur.

Bu baglanti noktasi:
- yatay ana bakirda: `terminal_world.x`
- dikey ana bakirda: `terminal_world.y`

olarak kullanilir.

Bu noktalardan lokal acilim koordinati uretilir:
- delik `x_mm`: ana bakir baslangicindan olan mesafe
- delik `y_mm`: `main_width_mm / 2`

Delik aciklamasi:
- `Tali bakir baglanti deligi`

## 9. Tali bakir nasil uretilir

Sistemin ana odagi burasidir.

Her faz icin, o fazi tasiyan her cihaz terminali icin bir tali bakir parcasi uretilir.

### 9.1. Tali bakirin baslangic noktasi

Baslangic, ana bakir uzerindeki baglanti noktasi yani `junction` noktasi olarak hesaplanir.

Yatay ana bakirda:
- `junction.x = terminal_world.x`
- `junction.y = ilgili fazin ana bakir merkez Y degeri`

Dikey ana bakirda:
- `junction.x = ilgili fazin ana bakir merkez X degeri`
- `junction.y = terminal_world.y`

### 9.2. Tali bakirin bitis noktasi

Bitis noktasi dogrudan cihaz terminalinin global koordinatidir:
- `terminal_world`

### 9.3. Rota tipi

Sistem iki tip rota uretir:

#### Duz rota
Asagidaki durumda tek segment kullanilir:
- baslangic ve bitis ayni `X` eksenindeyse
- veya ayni `Y` eksenindeyse

Bu durumda:
- 1 segment
- 0 bukum

#### L rota
Baslangic ve bitis ayni eksende degilse:
- ara nokta `(end.x, start.y)` olarak secilir
- ilk segment yatay
- ikinci segment dusey olur

Bu durumda:
- 2 segment
- 1 adet `90°` bukum

Bukum aciklamasi:
- `L baglanti bukum`

Yonu:
- `end.y > start.y` ise `yukari`
- degilse `asagi`

Not:
- Su an U rota veya engelden kacma hesabi yoktur.
- Ilk MVP mantigi ile ana bakir -> cihaz arasi dogrudan baglanti kurulur.

## 10. Delik uretimi nasil yapilir

### 10.1. Ana bakir delikleri

Her junction noktasi icin:
- `x_mm`: ana bakir boyunca mesafe
- `y_mm`: ana bakir genisliginin ortasi

### 10.2. Tali bakir delikleri

Tali bakirda delikler acilim uzerindeki kademeli uzunluga gore yerlestirilir.

Kural:
- ilk delik her zaman `x=0`
- sonraki delikler her segment sonuna gelir
- `y_mm = branch_width_mm / 2`

Delik aciklamalari:
- ilk delik: `Ana bakir baglanti deligi`
- son delik: `Cihaz terminal deligi`
- aradaki delik varsa: `Kose baglanti deligi`

Not:
- L rotada ara kosede de delik uretilir.
- Bu, mevcut implementasyon davranisidir. Uretim mantigi olarak ileride revize edilmesi gerekebilir.

## 11. Bukum uretimi nasil yapilir

Sadece L rotada bukum olusur.

Her bukum icin kaydedilen alanlar:
- `distance_from_start_mm`
- `angle_deg`
- `direction`
- `inner_radius_mm`
- `description`

Mesafe hesabi:
- ilk segment uzunlugu kadar

Yani bukum, acilimda ilk segmentin bittigi noktadadir.

## 12. Kesim boyu nasil hesaplanir

Her parca icin once duz segment uzunluklari toplanir:

`straight_length = sum(segment.length)`

Ardindan her bukum icin bend deduction hesaplanir.

Formuller:
- `BA = angle_rad * (inner_radius + k_factor * thickness)`
- `BD = 2 * (inner_radius + thickness) * tan(angle / 2) - BA`

Son kesim boyu:

`cut_length = straight_length - total_bend_deduction`

Bu nedenle mevcut sistem:
- sadece duz uzunluk toplami yapmaz
- bukum varsa duz toplamdan bir deduction duserek kesim boyu yazar

## 13. Veritabanina yazilan sonuc modeli

Her parca icin bir `busbars` kaydi olusur.

Alanlar:
- `part_no`
- `name`
- `busbar_type`
- `phase`
- `connected_device_label`
- `width_mm`
- `thickness_mm`
- `material`
- `quantity`
- `cut_length_mm`

Parcanin geometrisi alt tablolara yazilir:

### 13.1. `busbar_segments`
- segment sirasi
- baslangic `x/y`
- bitis `x/y`

### 13.2. `busbar_holes`
- delik sirasi
- lokal `x/y`
- cap
- slot bilgisi
- aciklama

### 13.3. `busbar_bends`
- bukum sirasi
- baslangictan mesafe
- aci
- yon
- ic yaricap
- aciklama

## 14. Part numarasi kurallari

Mevcut implementasyonda:

### Ana bakir
`MB-{PHASE}-{INDEX}`

Ornek:
- `MB-L1-001`

### Tali bakir
`TB-{DEVICE_LABEL}-{PHASE}-{INDEX}`

Ornek:
- `TB-QF1-L1-001`

## 15. Sonuc ozeti nasil hesaplanir

`get_results(...)` fonksiyonu su ozet bilgileri uretir:
- `main_busbar_count`
- `branch_busbar_count`
- `total_cut_length_mm`
- `total_hole_count`
- `total_bend_count`

Toplamlar veritabanina yazilan parcalar uzerinden okunur.

## 16. Cikti ekraninda ne gorunur

Frontend sonuc ekraninda su alanlar gosterilir:
- Hesaplama ozeti
- Tali bakir teknik resimleri
- Parca listesi
- Delik listesi
- Bukum listesi
- Disa aktar alanlari
- En altta genel pano gorunumu

Parca listesindeki `Goruntule` aksiyonu ile:
- `Tam Acilim`
- `Bukulmus Hali`

popup icinde acilir.

## 17. Mevcut kisitlar

Su anki implementasyonun sinirlari:
- Sadece duz ve L rota var
- Engel algilama yok
- U rota yok
- Faz terminali olmayan cihaz o faz icin atlanir
- Ana bakir ilk kabin referansina gore yerlestirilir
- Tali bakirda kosede delik uretilmesi gecici MVP davranisidir
- Gelismis imalat kurallari henuz yok:
  - delik kenar mesafesi
  - bukum-delik mesafesi
  - cakisma kontrolu
  - rota optimizasyonu

## 18. Ozet

Bugunku sistemin temel mantigi sudur:

1. Kabinler soldan saga global duzleme yerlestirilir.
2. Cihaz terminalleri kendi kabinlerine gore global koordinata tasinir.
3. Ana bakir, bakir ayarlarindaki referans koordinattan tek eksenli olarak uretilir.
4. Her cihaz terminali icin ana bakir uzerinde bir junction bulunur.
5. Junction ile cihaz terminali arasinda bir tali bakir uretilir.
6. Bu tali bakir icin segment, delik, bukum ve kesim boyu hesaplanir.
7. Tum sonuc kayitlari veritabanina yazilir ve UI tarafinda tablolar ile gosterilir.

Bu nedenle mevcut motorun ana ciktisi:
- cihaz ile ana bakir arasindaki tali bakir detaylaridir.
