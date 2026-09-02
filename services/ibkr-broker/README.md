# ForgeOS IBKR Broker Service

Servicio local que conecta ForgeOS con IB Gateway mediante la TWS API oficial.

## Seguridad inicial

La plantilla queda bloqueada por defecto:

```env
IBKR_READ_ONLY=true
LIVE_TRADING_ENABLED=false
```

No almacena usuario, contraseña ni 2FA de Interactive Brokers. La sesión se mantiene dentro de IB Gateway.

## Instalación

Desde `services/ibkr-broker`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Genera dos secretos diferentes:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48)); print(secrets.token_urlsafe(48))"
```

Configura `INTERNAL_API_KEY` y `APPROVAL_SECRET` y arranca:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

En `.env.local` de ForgeOS:

```env
IBKR_SERVICE_URL=http://127.0.0.1:8000
IBKR_INTERNAL_API_KEY=el-mismo-INTERNAL_API_KEY
```

No uses el prefijo `NEXT_PUBLIC_`.

## IB Gateway

En `Configure > Settings > API > Settings`:

- `Enable ActiveX and Socket Clients`: activado.
- `Allow connections from localhost only`: activado.
- Puerto de cuenta real: normalmente `4001`.
- Primera prueba: `Read-Only API` activado.
- Activa el log de mensajes API y nivel `Detail` durante las pruebas.

## Secuencia obligatoria

1. Abrir IB Gateway y autenticar manualmente.
2. Arrancar el servicio.
3. Abrir `http://localhost:3000/broker`.
4. Conectar y validar saldo, cuenta y posiciones.
5. Crear una propuesta sin ejecutarla.
6. Verificar límites, allowlist y nominal.
7. Solo después, desactivar `Read-Only API` en IB Gateway y cambiar:

```env
IBKR_READ_ONLY=false
LIVE_TRADING_ENABLED=true
```

8. Reiniciar el servicio.
9. Aprobar y escribir la frase exacta de ejecución.
10. Verificar el estado de la orden también en IB Gateway.

## Límites de v1

- Solo acciones `STK`.
- Solo órdenes limitadas `LMT`.
- Vigencia `DAY`.
- Sin ejecución fuera de horario.
- Sin opciones, futuros, forex ni órdenes de mercado.
- Sin retirada de fondos.
- Aprobación humana y segunda confirmación obligatorias.
- Parada de emergencia disponible mediante `POST /api/control/emergency-stop?enabled=true`.
