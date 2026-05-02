# PanelForge Parca Hesabi Dokumani

Bu dokuman, PanelForge icindeki mevcut parca hesabinin bugun kodda nasil calistigini matematiksel olarak aciklar.
Icerik varsayim degil, dogrudan implementasyona dayalidir.

Ana kaynak dosyalar:
- `backend/app/services/calculation_service.py`
- `backend/app/services/validation_service.py`
- `backend/app/domain/geometry.py`
- `backend/app/domain/busbar.py`
- `backend/app/db/models.py`

Bu dokumanin konusu ozellikle su soruya cevap verir:

`Bir ana veya tali bakir parcasi bugun sistemde hangi girdilerle, hangi geometriyle, hangi formullerle hesaplanir?`

## 1. Hesaplama motorunun bugunku kapsamı

Mevcut hesap motoru klasik 2D degil, 3D tabanli ortogonal bir model kullanir.

Sistem su ciktilari uretir:
- ana bakir parcasi veya parcalari
- tali bakir parcasi veya parcalari
- her parca icin 3D segment listesi
- her parca icin acinim delik koordinatlari
- her parca icin bukum noktasi
- kesim boyu
- toplam agirlik

Bugun motorun urettigi her parca `BusbarPart` mantigiyla temsil edilir.
Bir parca su yapidan olusur:

- `segments`: 3D duz dogru parcalari
- `holes`: acinim delikleri
- `bends`: bukum bilgileri
- `cut_length`: imalat icin kesim boyu

## 2. Hesaplamanin girdileri

Parca hesabi su veri gruplarina dayanir:

### 2.1. Pano ve kabin verileri
- `panel.phase_system`
- `panel.width_mm`, `height_mm`, `depth_mm`
- `panel.left_margin_mm`, `right_margin_mm`, `top_margin_mm`, `bottom_margin_mm`
- `project_panels` listesi
- her `project_panel.panel_definition.width_mm`
- her `project_panel.panel_definition.bottom_margin_mm`

### 2.2. Cihaz ve terminal verileri
- `project_devices.x_mm`, `y_mm`, `z_mm`
- `project_devices.rotation_deg`, `rotation_x_deg`, `rotation_y_deg`
- `device.width_mm`, `height_mm`, `depth_mm`
- `device_terminals.x_mm`, `y_mm`, `z_mm`
- `device_terminals.phase`
- `device_terminals.hole_diameter_mm`
- `device_terminals.terminal_face`

### 2.3. Bakir ayarlari
- `main_width_mm`, `main_thickness_mm`
- `branch_width_mm`, `branch_thickness_mm`
- `bend_inner_radius_mm`
- `default_hole_diameter_mm`
- `k_factor`
- `busbar_x_mm`, `busbar_y_mm`, `busbar_z_mm`
- `busbar_orientation`
- `busbar_length_mm`
- `bars_per_phase`
- `bar_gap_mm`
- `main_material`, `branch_material`
- `main_density_g_cm3`, `branch_density_g_cm3`

## 3. Hesaplamanin ust akisi

`calculate_project(project_id)` su sirayla calisir:

1. `validate_project(...)` ile veri kontrol edilir.
2. Mevcut eski `busbar` sonuclari silinir.
3. Faz listesi secilir.
4. Coklu kabin varsa global panel ofsetleri hesaplanir.
5. Her faz icin cihaz terminalleri bulunur.
6. Her faz icin ana bakir(lar) uretilir.
7. Her cihaz terminali icin tali bakir uretilir.
8. Her parcanin kesim boyu hesaplanir.
9. Sonuc veritabanina yazilir.
10. Ozet sonuc `get_results(...)` ile toplanir.

## 4. Faz sistemi

Faz listesi `panel.phase_system` alanindan turetilir:

- `3P` -> `[L1, L2, L3]`
- `3P+N` -> `[L1, L2, L3, N]`
- `3P+N+PE` -> `[L1, L2, L3, N, PE]`

Yani hesap motoru faz bazli dongu yapar:

`for each phase in phases:`

Her faz icin:
- o fazi tasiyan cihaz terminalleri toplanir
- en az bir terminal varsa ana bakir olusur
- sonra bu terminal sayisi kadar tali bakir olusur

## 5. Koordinat sistemi

Backend bugun 3D koordinat kullanir:

- `X`: saga
- `Y`: yukari
- `Z`: one dogru veya derinlik ekseni
- birim: `mm`

Pratikte her nokta su sekildedir:

`P = (x, y, z)`

Bir segment de:

`S = [P_start, P_end]`

uzunlugu:

`|S| = sqrt((dx)^2 + (dy)^2 + (dz)^2)`

Kodda bu `Point3D.distance_to(...)` ve `Segment3D.length` ile yapilir.

## 6. Coklu kabin ofseti

Birden fazla pano yan yana ise her kabin icin global ofset uretilir.

Kabinler `seq` sirasina gore soldan saga dizilir.

Kabin `i` icin:

- `offset_x(i) = onceki kabin genisliklerinin toplami`
- `offset_y(i) = panel_definition.bottom_margin_mm`
- `offset_z(i) = 0`

Yani:

`Offset_i = (sum(width_1 ... width_(i-1)), bottom_margin_i, 0)`

Bu hesap `_project_panel_offsets_3d(...)` icinde yapilir.

Bu sayede cihaz lokal bir kabinde dursa bile, tum sistem icinde global koordinata tasinabilir.

## 7. Terminalin global 3D konumu

Bir terminalin son konumu iki asamada bulunur:

1. cihaz icindeki lokal terminal koordinati donusturulur
2. cihazin pano icindeki ve kabinin global ofseti eklenir

### 7.1. Terminal lokal vektoru

Terminalin cihaz icindeki vektoru:

`t_local = (x_t, y_t, z_t)`

### 7.2. Donusum sirasi

Kodda su donusum uygulanir:

`t_rot = Rz(rz) * Ry(ry) * Rx(rx) * t_local`

Burada:
- `rx = placement.rotation_x_deg`
- `ry = placement.rotation_y_deg`
- `rz = placement.rotation_deg`

Tek tek donusumler:

#### X ekseni etrafinda donus

`x' = x`

`y' = y cos(rx) - z sin(rx)`

`z' = y sin(rx) + z cos(rx)`

#### Y ekseni etrafinda donus

`x' = x cos(ry) + z sin(ry)`

`y' = y`

`z' = -x sin(ry) + z cos(ry)`

#### Z ekseni etrafinda donus

`x' = x cos(rz) - y sin(rz)`

`y' = x sin(rz) + y cos(rz)`

`z' = z`

Bu implementasyon `rotate_xyz(...)` ile yapilir.

### 7.3. Cihaz referans noktasinin anlami

Kodda onemli bir detay var:

- `placement.x_mm`, cihazin sol kenari degil, yatay merkezi referans aliyor
- terminal koordinatlari ise cihazin sol-alt referansina gore tanimli

Bu nedenle X ekseninde yarim genislik kadar kaydirma yapiliyor:

`x_world_local = placement.x_mm - device.width_mm / 2 + t_rot.x`

`y_world_local = placement.y_mm + t_rot.y`

`z_world_local = placement.z_mm + t_rot.z`

Yani terminalin cihaz-ve-kabin-oncesi dunya noktasi:

`T_local_world = (placement.x - width/2 + t_rot.x, placement.y + t_rot.y, placement.z + t_rot.z)`

### 7.4. Kabin global ofsetinin eklenmesi

Sonra bu noktaya kabin ofseti eklenir:

`T_world = Offset_panel + T_local_world`

Yani:

`T_world = (offset_x + x_world_local, offset_y + y_world_local, offset_z + z_world_local)`

Bu `T_world`, tali bakirin cihaza baglanacagi gercek 3D bitis noktasi olur.

## 8. Ana bakir rayinin merkezi

Her faz icin bir veya daha fazla ana bakir olabilir.

Kodda:

`bars_per_phase = copper.bars_per_phase or 1`

Eger `bars_per_phase = n` ise her faz icin `n` adet paralel ana bara uretilir.

### 8.1. Ana parametreler

- `bx = busbar_x_mm`
- `by = busbar_y_mm`
- `bz = busbar_z_mm`
- `w = main_width_mm`
- `t = main_thickness_mm`
- `g = bar_gap_mm`

Bir faz grubundaki bar adimi:

`bar_step = t + g`

Global bar indeksi:

`global_index = phase_index * bars_per_phase + bar_index`

### 8.2. Ray merkezi

Kod bugun merkez noktayi su sekilde kurar:

`center_x = base_offset.x + bx`

`center_y = base_offset.y + by + w/2`

`center_z = base_offset.z + bz + global_index * bar_step + t/2`

Yani:
- ana baranin genisligi `Y` ekseninde tasiniyor
- kalinligi `Z` ekseninde istifleniyor
- fazlar ve paralel barlar `Z` ekseninde ardisik duruyor

Bu nokta `_rail_center_3d(...)` ile uretilir.

## 9. Ana bakir segmenti

Ana bakir segmenti bugun tek parca duz bir segmenttir.

Uzunlugu:

`L_main = busbar_length_mm`

### 9.1. Yatay orientation

Eger `busbar_orientation != "vertical"` ise sistem bunu yatay kabul eder.

Bu durumda:

`start = (base_offset.x + bx, center_y, center_z)`

`end   = (base_offset.x + bx + L_main, center_y, center_z)`

Yani ana bakir `X` ekseni boyunca uzar.

### 9.2. Dikey orientation

Eger `busbar_orientation == "vertical"` ise:

`start = (center_x, base_offset.y + by, center_z)`

`end   = (center_x, base_offset.y + by + L_main, center_z)`

Yani ana bakir `Y` ekseni boyunca uzar.

## 10. Terminalin ana bakira izdussumu: junction

Tali bakirin ana bakira baglandigi nokta `junction` olarak hesaplanir.

Bu hesap bugun geometrik projeksiyonla yapilir.

Ana bakir segmenti:

- baslangic noktasi: `A`
- yon vektoru: `u`
- uzunluk: `L`

Terminal noktasi:

`T`

Projeksiyon parametresi:

`lambda = (T - A) . u`

Sonra segment disina tasmamak icin clamp uygulanir:

`lambda_clamped = max(0, min(lambda, L))`

Junction noktasi:

`J = A + lambda_clamped * u`

Bu bugun klasik "same X / same Y" mantigindan daha dogru bir 3D izdusumdur.

Kod: `project_point_onto_segment(...)` ve `_junction_3d(...)`

## 11. Tali bakir rotasi

Her tali bakir:

`start = J`

`end = T_world`

arasi kurulur.

Kod `_route_3d(...)` ile ortogonal bir yol uretiyor.

### 11.1. Eksen farklari

`dx = |end.x - start.x|`

`dy = |end.y - start.y|`

`dz = |end.z - start.z|`

`0.01 mm` ustundeki eksen farklari hareket gereken eksen sayilir.

### 11.2. Rota siniflari

#### Tek eksen farki

Sadece bir eksende fark varsa:

- 1 segment
- 0 bukum

Matematiksel olarak:

`segments = [[start, end]]`

#### Iki eksen farki

Iki eksende fark varsa:

- 2 segment
- 1 adet 90 derece bukum

Kodun bugunku oncelik sirasi:

- once `X`
- sonra `Y`
- sonra `Z`

Yani ornek olarak X ve Y farkliysa ara nokta:

`P1 = (end.x, start.y, start.z)`

ve rota:

`start -> P1 -> end`

#### Uc eksen farki

Uc eksende de fark varsa:

- 3 segment
- 2 adet 90 derece bukum

Ara noktalar:

`P1 = (end.x, start.y, start.z)`

`P2 = (end.x, end.y, start.z)`

rota:

`start -> P1 -> P2 -> end`

ve son segment:

`P2 -> end`

Genel mantik:

1. X hedefe cekilir
2. sonra Y hedefe cekilir
3. sonra Z hedefe cekilir

Bu nedenle rota optimizasyonu yoktur; deterministik bir eksen-oncelikli ortogonal yol vardir.

## 12. Bukum tipi, bukum ekseni ve bukum yonu

Ardisik iki segment arasinda bukum varsa, tip ve eksen tespit edilir.

### 12.1. Dominant eksen

Her segment icin dominant eksen:

- `X`, `Y` veya `Z`

olarak secilir; en buyuk mutlak farki olan eksen dominant sayilir.

### 12.2. Bukum tipi

Iki segmentin eksenlerinde `Z` varsa:

`bend_type = flatwise`

Yoksa:

`bend_type = edgewise`

Yani bugunku implementasyon:

- `XY` duzlemindeki donusleri `edgewise`
- `XZ` veya `YZ` iceren donusleri `flatwise`

olarak siniflar.

### 12.3. Bukum ekseni

Iki segmentin eksen ciftine gore:

- `XY` donusu -> bukum ekseni `Z`
- `XZ` donusu -> bukum ekseni `Y`
- `YZ` donusu -> bukum ekseni `X`

### 12.4. Bukum yonu

Yon, ikinci segmentin yonunden cikar:

- dominant eksen `X` ise:
  - `v.x > 0` -> `sag`
  - `v.x < 0` -> `sol`
- dominant eksen `Y` ise:
  - `v.y > 0` -> `yukari`
  - `v.y < 0` -> `asagi`
- dominant eksen `Z` ise:
  - `v.z > 0` -> `ileri`
  - `v.z < 0` -> `geri`

## 13. Bend allowance ve bend deduction

Her bukum 90 derece olarak uretilir.

Kodda iki katsayi var:

- `k_flatwise = copper.k_factor` ya da varsayilan `0.33`
- `k_edgewise = 0.40`

Seçim:

- bukum tipi `flatwise` ise `k = k_flatwise`
- bukum tipi `edgewise` ise `k = k_edgewise`

### 13.1. Bend allowance

Kodda:

`theta = radians(angle_deg)`

`BA = theta * (R + K * t)`

Burada:
- `R = inner_radius`
- `K = k_factor`
- `t = thickness`

90 derece icin:

`theta = pi / 2`

dolayisiyla:

`BA_90 = (pi/2) * (R + K * t)`

### 13.2. Bend deduction

Kodda:

`BD = 2 * (R + t) * tan(theta / 2) - BA`

90 derece icin:

`tan(45 deg) = 1`

oldugundan:

`BD_90 = 2 * (R + t) - BA_90`

Bu formulu hem `calculation_service.py::_bend_allowance(...)` hem de
`domain/busbar.py::Bend.compute_deduction(...)` kullanir.

## 14. Kesim boyu

Bir parcanin geometrik duz boyu:

`straight_length = sum(|segment_i|)`

Bir parcadaki toplam bend deduction:

`BD_total = sum(BD_i)`

Kesim boyu:

`cut_length = max(0, straight_length - BD_total)`

Bu cok kritik bir nokta:

Mevcut sistem "duz segment toplamı" yazmaz.
Bukum varsa, duz toplamdan deduction duser.

### 14.1. Ornek

Iki segmentli bir parca olsun:

- birinci segment: `200 mm`
- ikinci segment: `300 mm`
- kalinlik: `5 mm`
- ic yaricap: `10 mm`
- bukum tipi: `flatwise`
- `k = 0.33`

O zaman:

`straight_length = 200 + 300 = 500 mm`

`BA = (pi/2) * (10 + 0.33 * 5)`

`BA = 1.570796... * 11.65`

`BA ~= 18.3008 mm`

`BD = 2 * (10 + 5) - 18.3008`

`BD = 30 - 18.3008`

`BD ~= 11.6992 mm`

Son kesim boyu:

`cut_length = 500 - 11.6992 = 488.3008 mm`

Veritabanina yazilirken:

`round(cut_length, 2) = 488.30 mm`

## 15. Delik hesabi

Mevcut sistemde delikler acinim koordinat sisteminde verilir.

Yani delik koordinatlari parcanin acinim baslangicina goredir.

### 15.1. Ana bakir delikleri

Ana bakir duz segment oldugu icin her junction noktasi bir delik olur.

Rayin baslangic noktasi `A`, normalized yonu `u`, junction noktasi `J` ise:

`x_hole = clamp((J - A) . u, 0, L_main)`

`y_hole = main_width_mm / 2`

Yani her delik merkezde acilir.

Tekrarlayan ayni `x_hole` degerleri set ile elenir.

### 15.2. Tali bakir delikleri

Tali bakirda kural:

- ilk delik her zaman `x = 0`
- her segment sonu icin bir delik daha eklenir
- `y = branch_width_mm / 2`

Yani `n` segment varsa:

- ilk delik: `x_0 = 0`
- ikinci delik: `x_1 = |seg_1|`
- ucuncu delik: `x_2 = |seg_1| + |seg_2|`
- ...
- son delik: `x_n = sum(|seg_i|) = straight_length`

Matematiksel olarak:

`x_k = sum(i=1..k) |seg_i|`

`y_k = branch_width_mm / 2`

### 15.3. Delik capi

Tali bakir delik capi once terminalden gelir:

`d = terminal.hole_diameter_mm`

eger bu bos ise:

`d = default_hole_diameter_mm`

Ana bakirda ise:

`d = copper.default_hole_diameter_mm`

### 15.4. Delik aciklamalari

Tali bakirda:
- ilk delik: `Ana bakir baglanti deligi`
- son delik: `Cihaz terminal deligi`
- aradaki delik: `Kose baglanti deligi`

Bu, bugunku implemantasyonun gercek davranisidir.

## 16. Parca sayisi mantigi

Bir fazda `m` adet uygun cihaz terminali varsa:

- ana bakir sayisi = `bars_per_phase`
- tali bakir sayisi = `m`

Tum proje icin:

`main_busbar_count = aktif_faz_sayisi * bars_per_phase`

aktif faz, o fazda en az bir cihaz terminali olan fazdir.

`branch_busbar_count = faz bazinda bulunan tum terminal sayilarinin toplami`

Not:
- Bir cihazda belirli bir faz terminali yoksa o cihaz o faz icin hesaba girmez.
- Hata atilmaz, sadece o faz dongusunde atlanir.

## 17. Part no olusumu

### 17.1. Ana bakir

Tek bar ise:

`MB-{PHASE}-{phase_index+1:03d}`

Paralel bar varsa:

`MB-{PHASE}-{phase_index+1:03d}-B{bar_index+1}`

Ornek:
- `MB-L1-001`
- `MB-L1-001-B2`

### 17.2. Tali bakir

`TB-{device_label}-{phase}-{branch_index:03d}`

Ornek:
- `TB-QF1-L1-001`

## 18. Agirlik hesabi

Sonuc ekranindaki toplam agirlik su formulle hesaplanir:

`volume_mm3 = cut_length_mm * width_mm * thickness_mm`

`weight_kg = volume_mm3 * density_g_cm3 / 1_000_000`

Sebep:

- `1 cm3 = 1000 mm3`
- `density` birimi `g/cm3`
- gramdan kilograma gecmek icin bir `1000` daha bolunur

Dolayisiyla toplam bolen:

`1000 * 1000 = 1_000_000`

Malzeme yogunlugu secimi:

- `main` icin `main_density_g_cm3`, yoksa malzeme default'u
- `branch` icin `branch_density_g_cm3`, yoksa malzeme default'u

Varsayilanlar:
- `Cu = 8.96 g/cm3`
- `Al = 2.70 g/cm3`

## 19. Veritabanina yazilan geometri

Her `BusbarPart` veritabanina su sekilde yazilir:

### 19.1. `busbars`
- parca kimligi
- tip
- faz
- malzeme
- kesit
- kesim boyu

### 19.2. `busbar_segments`

Her segment icin:
- `start_x_mm`
- `start_y_mm`
- `start_z_mm`
- `end_x_mm`
- `end_y_mm`
- `end_z_mm`

Yani geometri 3D tutulur.

### 19.3. `busbar_holes`

Her delik icin:
- `x_mm`
- `y_mm`
- `diameter_mm`
- `slot_width_mm`
- `slot_length_mm`
- `face`
- `description`

Not:
- delikler acinim koordinatindadir
- segment koordinatlari ise 3D uzay koordinatindadir

### 19.4. `busbar_bends`

Her bukum icin:
- `distance_from_start_mm`
- `angle_deg`
- `direction`
- `inner_radius_mm`
- `bend_axis`
- `bend_type`
- `bend_allowance_mm`

## 20. Bugunku sistemin matematiksel ozeti

Mevcut motorun tum mantigi su zincire indirgenebilir:

### 20.1. Terminal donusumu

`T_world = Offset_panel + Placement + Rotation * T_local`

daha acik haliyle:

`T_world = Offset_panel + (placement.x - width/2, placement.y, placement.z) + Rz * Ry * Rx * (x_t, y_t, z_t)`

### 20.2. Ana bakir rayi

`MainBar = [A, A + L * e]`

burada `e`, orientation'a gore `X` veya `Y` yonudur.

### 20.3. Junction

`J = projection(T_world onto MainBar)`

### 20.4. Tali rota

`Route = orthogonal_path(J, T_world)`

### 20.5. Duz boy

`straight_length = sum(|seg_i|)`

### 20.6. Bukum dusumu

`BD_i = 2 * (R + t) * tan(theta_i/2) - theta_i_rad * (R + K_i * t)`

### 20.7. Kesim boyu

`cut_length = straight_length - sum(BD_i)`

### 20.8. Delikler

`hole_y = width / 2`

`hole_x` degeri ise acinim boyunca kademeli uzunluk toplami ile bulunur.

## 21. Mevcut kisitlar

Bugun kodun yaptigi ama henuz ileri seviye olmayan kisimlar:

- rota optimizasyonu yok
- engel kacma yok
- cihaz cakisma kontrolu yok
- delik-kenar mesafesi kontrolu yok
- delik-bukum mesafesi kontrolu yok
- U rota veya daha kompleks 3D route yok
- tali bakirda ara koselerde delik ekleniyor
- bir fazdaki baglanti referansi her zaman `bar_index = 0` ana barasi uzerinden yapiliyor

Bu nedenle bugunku hesap motoru:

`deterministik, ortogonal, imalata yaklasan ama tam imalat-kurali kontrollu olmayan bir 3D busbar generator`

olarak tanimlanabilir.

## 22. Sonuc

Bugun sistemde bir parcanin hesabi su sekilde yapilir:

1. faz bazli terminal bulunur
2. terminal global 3D koordinata tasinir
3. ana bakir rayi uzerindeki izdusum noktasi hesaplanir
4. o nokta ile terminal arasinda ortogonal yol uretilir
5. segmentler olusturulur
6. segment gecislerinde 90 derece bukum tanimlanir
7. bend deduction ile kesim boyu bulunur
8. delikler acinim ekseninde merkezlenir
9. sonuc veritabanina 3D segment + 2D acinim mantigi ile yazilir

Yani bugunku "parca hesabi" sadece tablo ureten bir hesap degil, su matematik zinciridir:

`3D terminal transformasyonu -> ray projeksiyonu -> ortogonal rota -> bend deduction -> acinim delikleri -> DB ciktisi`
