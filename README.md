# PanelForge

PanelForge, elektrik panolarinda kullanilan ana ve tali bakir baralarin olculendirilmesini otomatiklestiren web tabanli bir muhendislik uygulamasidir.

## Hizli Baslangic

```bash
make up
```

Ardindan:

- Frontend: http://localhost:5174
- Backend API: http://localhost:8001/docs

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
