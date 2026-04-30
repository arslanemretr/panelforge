# PanelForge

PanelForge, elektrik panolarinda kullanilan ana ve tali bakir baralarin olculendirilmesini otomatiklestiren web tabanli bir muhendislik uygulamasidir.

## Hizli Baslangic

```bash
make up
```

Ardindan:

- Frontend: http://localhost:5174
- Backend API: http://localhost:8001/docs

## Production Deploy

Production ortaminda frontend'in dev server ile yayinlanmasi onerilmez. Bunun yerine:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Bu kurulumda:

- frontend statik build olarak sunulur
- `/api` istekleri ayni domain altindan backend'e proxylanir
- `localhost:8001` bagimliligi ortadan kalkar

## Servisler

- `frontend`: React + TypeScript + Vite
- `backend`: FastAPI + SQLAlchemy + Alembic
- `database`: PostgreSQL

## Gelistirme Notlari

- Hesap motoru MVP surumunde basit L-rotalari kullanir.
- Cihaz rotasyonu 0, 90, 180 ve 270 derece icin desteklenir.
- Export servisleri PDF, DXF, Excel ve CSV olarak ilk surumle birlikte gelir.

## Teknik Dokumanlar

- [Hesaplama Dokumani](docs/calculation-engine.md)
