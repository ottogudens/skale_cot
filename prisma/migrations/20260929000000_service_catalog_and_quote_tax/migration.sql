CREATE TABLE "ServiceItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "scope" TEXT NOT NULL DEFAULT '',
  "conditions" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'Servicios técnicos',
  "unit" TEXT NOT NULL DEFAULT 'servicio',
  "price" INTEGER NOT NULL,
  "marketMinPrice" INTEGER,
  "marketMaxPrice" INTEGER,
  "marketRationale" TEXT NOT NULL DEFAULT '',
  "marketSources" TEXT NOT NULL DEFAULT '[]',
  "marketCheckedAt" TIMESTAMP(3),
  "taxExempt" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuoteItem" ADD COLUMN "taxExempt" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "ServiceItem" ("id", "name", "description", "scope", "conditions", "category", "unit", "price", "marketMinPrice", "marketMaxPrice", "marketRationale", "updatedAt") VALUES
('svc-example-001', 'Instalación de punto de red Cat6', 'Tendido, terminación y prueba básica de un punto de red Cat6.', 'Incluye tendido en canalización existente, terminación en ambos extremos, rotulación y prueba de continuidad. Unidad por punto.', 'No incluye cable, canalizaciones nuevas, perforaciones especiales ni certificación con equipo calibrado. Valor neto referencial, revisar distancia y accesibilidad.', 'Redes y cableado', 'punto', 55000, 35000, 80000, 'Precio de partida referencial basado en precios públicos de cableado Cat6 instalado; ajustar por canalización, distancia y certificación.', CURRENT_TIMESTAMP),
('svc-example-002', 'Instalación y configuración de cámara IP', 'Montaje y puesta en marcha de una cámara IP en sistema existente.', 'Montaje, orientación, conexión, alta en grabador o plataforma y verificación de visualización. Unidad por cámara.', 'No incluye cámara, cableado extenso, trabajos en altura especial, canalización ni configuración de grabador fuera del alcance acordado.', 'Videovigilancia', 'cámara', 110000, 80000, 160000, 'Rango público chileno de instalación simple por cámara; complejidad, cableado y altura modifican el valor.', CURRENT_TIMESTAMP),
('svc-example-003', 'Mantención preventiva de cámara CCTV', 'Inspección y limpieza preventiva de una cámara y su conexión.', 'Limpieza exterior, revisión de enfoque, conectividad, imagen nocturna y registro de hallazgos. Unidad por cámara.', 'No incluye repuestos, reparación de cableado, trabajo en altura con equipo especial ni visita mínima. Considerar valor mínimo por salida.', 'Videovigilancia', 'cámara', 25000, 15000, 35000, 'Valor de partida estimado para mantención por unidad; cotizar tarifa mínima y acceso a altura.', CURRENT_TIMESTAMP),
('svc-example-004', 'Certificación de punto de red', 'Certificación y registro de desempeño de un enlace de cableado estructurado.', 'Medición con certificador compatible con categoría solicitada, resultado por enlace y entrega de informe digital.', 'Requiere enlace terminado y accesible. No incluye reparación de fallas ni suministro de materiales.', 'Redes y cableado', 'punto', 18000, 10000, 30000, 'Rango de referencia interno; cambia según certificador, categoría y cantidad de enlaces.', CURRENT_TIMESTAMP),
('svc-example-005', 'Armado y ordenamiento de rack', 'Instalación, organización y rotulación de equipos y cableado en rack existente.', 'Montaje de equipos entregados por cliente, ordenamiento horizontal, rotulación y revisión visual de conectividad.', 'No incluye rack, PDU, patch cords, equipos ni reterminación masiva de enlaces. Precio por jornada o alcance definido.', 'Infraestructura', 'servicio', 180000, 120000, 280000, 'Valor de partida estimado para jornada técnica; depende del tamaño del rack y estado del cableado.', CURRENT_TIMESTAMP),
('svc-example-006', 'Configuración de router o firewall', 'Configuración de conectividad, redes y reglas básicas en router o firewall existente.', 'WAN/LAN, direccionamiento, DNS, DHCP, NAT, reglas acordadas, respaldo de configuración y prueba de conectividad.', 'No incluye equipo, licencias, migraciones complejas, VPN multi-sede ni soporte mensual. Requiere credenciales y ventana de cambio.', 'Redes', 'servicio', 90000, 45000, 160000, 'Referencia de diagnóstico/configuración de redes publicada en Chile; el alcance de firewall puede ampliar el valor.', CURRENT_TIMESTAMP),
('svc-example-007', 'Instalación y configuración de punto Wi-Fi', 'Montaje y puesta en servicio de un access point en red existente.', 'Fijación, conexión PoE, configuración de SSID y seguridad acordados, actualización y prueba de cobertura local.', 'No incluye access point, cableado nuevo, canalización ni estudio RF. La cobertura depende de materiales y distribución del recinto.', 'Redes', 'punto', 65000, 45000, 100000, 'Valor de partida estimado por punto; validar altura, cableado y configuración centralizada.', CURRENT_TIMESTAMP),
('svc-example-008', 'Instalación de control de acceso para puerta', 'Montaje y configuración básica de un acceso peatonal en puerta existente.', 'Instalación de lector, cerradura compatible, botón de salida, conexión al controlador y prueba de apertura.', 'No incluye controladora, lector, cerradura, fuente, cableado/canalización, modificación de puerta ni integración con terceros.', 'Control de acceso', 'puerta', 190000, 140000, 350000, 'Rango de partida estimado para mano de obra; cantidad de puertas e integración modifican significativamente el proyecto.', CURRENT_TIMESTAMP),
('svc-example-009', 'Visita de diagnóstico técnico en terreno', 'Evaluación de fallas o necesidades en redes, videovigilancia y telecomunicaciones.', 'Levantamiento básico, pruebas funcionales, identificación de causa probable y recomendaciones de próximos pasos.', 'No incluye reparación, materiales, informe pericial ni desplazamiento fuera del radio acordado. Definir duración y tarifa de visita.', 'Soporte técnico', 'visita', 60000, 45000, 100000, 'Referencia pública de configuración y diagnóstico de red; ajustar por traslado y duración.', CURRENT_TIMESTAMP),
('svc-example-010', 'Puesta en marcha de sistema CCTV', 'Configuración e integración de un sistema de videovigilancia instalado.', 'Alta de cámaras en NVR/VMS, fecha y hora, perfiles básicos, usuarios, visualización remota y capacitación breve.', 'No incluye grabador, licencias, almacenamiento, reparación de red ni configuración avanzada de analíticas.', 'Videovigilancia', 'sistema', 160000, 90000, 240000, 'Valor estimado de partida por sistema pequeño; número de cámaras, usuarios e integraciones definen el precio final.', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "ServiceItem" SET "marketSources" = '[{"title":"Precio cableado estructurado Cat6 en Chile - Smarthold","url":"https://smarthold.cl/pages/cableado-estructurado-precio","note":"Referencia pública publicada: $35.000–$80.000 CLP por punto Cat6 instalado."}]', "marketCheckedAt" = CURRENT_TIMESTAMP WHERE "id" = 'svc-example-001';
UPDATE "ServiceItem" SET "marketSources" = '[{"title":"Precio de instalación de cámaras en Chile - Jobbing","url":"https://www.jobbing.cl/precios/cuanto-cuesta-instalar-camaras-seguridad","note":"Referencia pública de instalación simple por cámara: $80.000–$160.000 CLP."}]', "marketCheckedAt" = CURRENT_TIMESTAMP WHERE "id" = 'svc-example-002';
UPDATE "ServiceItem" SET "marketSources" = '[{"title":"Soporte TI y configuración de red - Nansso","url":"https://www.nansso.cl/soporte-ti","note":"Tarifario 2025–2026 incluye configuración de red LAN/Wi-Fi por $45.000 CLP."}]', "marketCheckedAt" = CURRENT_TIMESTAMP WHERE "id" = 'svc-example-006';

INSERT INTO "CatalogCategory" ("id", "name", "updatedAt")
SELECT 'cat-' || md5(source."name"), source."name", CURRENT_TIMESTAMP
FROM (
  SELECT "category" AS "name" FROM "CatalogItem" WHERE BTRIM("category") <> ''
  UNION
  SELECT "category" AS "name" FROM "ServiceItem" WHERE BTRIM("category") <> ''
) AS source
ON CONFLICT ("name") DO NOTHING;
