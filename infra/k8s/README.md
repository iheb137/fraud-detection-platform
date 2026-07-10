# Déploiement Kubernetes — Plateforme de Détection des Appels Frauduleux

> Cluster local Docker Desktop K8s. Namespace : `fraud-detection`.
> Images locales (pas de registry) : `fraud-backend:1.0`, `fraud-ml:1.0`, `fraud-frontend:1.0`.

## Architecture

| Composant | Type | Stockage | Accès |
|---|---|---|---|
| fraud-postgres | StatefulSet postgres:18-alpine | PVC 2 Gi | interne :5432 |
| fraud-kafka | StatefulSet apache/kafka:3.9.0 KRaft | éphémère (transport) | interne :9092 / NodePort :30092 |
| fraud-backend | Deployment Spring Boot | — | interne :8081 (HPA 1→2) |
| fraud-ml | Deployment FastAPI | PVC 500 Mi (modèles, survit à la promotion) | interne :8000 |
| fraud-frontend | Deployment nginx (proxy /api, /ml) | — | **LoadBalancer localhost:8090** |

Config par variables d'env (12-factor), mots de passe dans des Secrets.
Le frontend est buildé avec `apiUrl: /api/v1` (relatif) — nginx proxifie vers le backend, zéro CORS.

## Démarrage / arrêt

```powershell
# Tout déployer (idempotent)
kubectl apply -f infra/k8s/

# Tout arrêter sans perdre les données (PVC conservés)
kubectl -n fraud-detection scale deployment --all --replicas=0
kubectl -n fraud-detection scale statefulset --all --replicas=0

# Redémarrer
kubectl -n fraud-detection scale statefulset --all --replicas=1
kubectl -n fraud-detection scale deployment --all --replicas=1

# Détruire (PVC inclus = données cluster perdues)
kubectl delete namespace fraud-detection
```

Application : http://localhost:8090 (comptes de test habituels).

## Rebuild d'une image après modification du code

```powershell
docker build -t fraud-backend:1.0 backend/backend
kubectl -n fraud-detection rollout restart deployment/fraud-backend
```
(idem `fraud-ml:1.0` avec `ml-service/`, `fraud-frontend:1.0` avec `frontend/`)

## Démo streaming temps réel

```powershell
cd ml-service\simulator
python cdr_producer.py --broker localhost:30092 --rate 2
# → alertes visibles en live sur http://localhost:8090
```

## Démo HPA (montée en charge)

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:8090/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"analyste@tunisietelecom.tn","password":"Admin@2025"}'
$token = $login.token
1..8 | ForEach-Object { Start-Job -ScriptBlock { param($t) 1..500 | ForEach-Object { Invoke-RestMethod -Uri "http://localhost:8090/api/v1/alerts?page=0&size=50" -Headers @{Authorization="Bearer $t"} | Out-Null } } -ArgumentList $token }
kubectl -n fraud-detection get hpa -w   # observer le passage 1 -> 2 replicas
Get-Job | Remove-Job -Force             # nettoyage après la démo
```

## Migration de données locale -> cluster

```powershell
kubectl -n fraud-detection scale deployment fraud-backend --replicas=0
$env:PGPASSWORD = "iheb"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -d fraud_detection --no-owner --no-privileges --clean --if-exists -f "$env:TEMP\fraud_dump.sql"
cmd /c "kubectl -n fraud-detection exec -i fraud-postgres-0 -- psql -U postgres -d fraud_detection -q < %TEMP%\fraud_dump.sql"
kubectl -n fraud-detection scale deployment fraud-backend --replicas=1
```

## Troubleshooting (leçons apprises)

| Symptôme | Cause | Fix |
|---|---|---|
| Kafka CrashLoop `advertised.listeners ... 0.0.0.0` | l'image apache/kafka rejette `0.0.0.0` dans les listeners | syntaxe hôte vide : `PLAINTEXT://:9092` |
| `kubectl apply` sur StatefulSet en crash ne change rien | rolling update gelé sur pod en CrashLoopBackOff | `kubectl delete pod <pod>` pour forcer la recréation |
| nginx crash `host not found in upstream` | upstream irrésoluble au démarrage | en K8s : le Service doit exister ; en docker : `--add-host host.docker.internal:host-gateway` |
| Backend pas ready | JVM + schéma Hibernate lents au premier boot | readiness initialDelay 40s, failureThreshold 6 — attendre |
| HPA `<unknown>` | metrics-server vient d'être installé | attendre 1-2 min ; vérifier `kubectl top pods` |
| Build front : `npm ci` désynchronisé | package-lock.json périmé | `npm install` local puis rebuild |
| Modèle ML illisible dans le pod | version scikit-learn différente du .pkl | `requirements-docker.txt` doit pinner la version qui a sauvé le modèle |

## Dev local vs cluster

Les deux coexistent : le dev local (ports 8081/4200/8000/5432/9092) est inchangé.
Le cluster vit sur 8090 (app) et 30092 (Kafka externe). Deux bases distinctes — re-migrer si besoin de resynchroniser.