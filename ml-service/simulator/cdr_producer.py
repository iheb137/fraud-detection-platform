"""
Simulateur reseau telecom : publie des CDR realistes sur le topic cdr-stream.
Reproduit les 4 patterns de fraude du modele + trafic legitime majoritaire.
Usage :
    python cdr_producer.py                  # 2 CDR/s en continu (Ctrl+C pour stopper)
    python cdr_producer.py --rate 5         # 5 CDR/s
    python cdr_producer.py --count 50       # 50 CDR puis stop
"""
import argparse
import json
import random
import time
import uuid
from datetime import datetime
from kafka import KafkaProducer

RISKY = ["SO", "SL", "GN", "LR", "CU", "KP", "SS", "TD"]
SAFE = ["TN", "FR", "DE", "IT", "ES", "US", "GB", "MA", "DZ"]

def tn_number():
    return "+216" + str(random.randint(20000000, 99999999))

def base(now):
    return {
        "call_id": str(uuid.uuid4()),
        "calling_number": tn_number(),
        "called_number": tn_number(),
        "call_start_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "call_type": "VOICE",
        "call_direction": "OUT",
        "imei": str(random.randint(10**14, 10**15 - 1)),
        "cell_id": f"CELL_{random.randint(1, 500):04d}",
    }

def legit(now):
    c = base(now)
    c.update(call_duration_sec=random.randint(20, 900),
             destination_country=random.choice(SAFE),
             revenue=round(random.uniform(0.05, 2.5), 2))
    return c

def irsf(now):
    c = base(now)
    c.update(call_duration_sec=random.randint(3600, 10800),
             destination_country=random.choice(RISKY),
             called_number="+252" + str(random.randint(10000000, 99999999)),
             revenue=round(random.uniform(30.0, 120.0), 2))
    return c

def wangiri(now):
    c = base(now)
    c.update(call_duration_sec=random.randint(1, 3),
             destination_country=random.choice(RISKY),
             revenue=round(random.uniform(0.0, 0.1), 2))
    return c

def simbox(now):
    c = base(now)
    c.update(call_duration_sec=random.randint(60, 240),
             destination_country=random.choice(RISKY),
             revenue=round(random.uniform(0.01, 0.3), 2))
    return c

def pbx(now):
    c = base(now)
    c.update(call_duration_sec=random.randint(1800, 7200),
             destination_country=random.choice(RISKY),
             revenue=round(random.uniform(20.0, 90.0), 2))
    return c

GENERATORS = [(legit, 0.80), (irsf, 0.06), (wangiri, 0.06), (simbox, 0.05), (pbx, 0.03)]

def pick(now):
    r, acc = random.random(), 0.0
    for gen, w in GENERATORS:
        acc += w
        if r <= acc:
            return gen(now)
    return legit(now)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rate", type=float, default=2.0, help="CDR par seconde")
    ap.add_argument("--count", type=int, default=0, help="0 = infini")
    ap.add_argument("--broker", default="localhost:9092")
    args = ap.parse_args()

    producer = KafkaProducer(
        bootstrap_servers=args.broker,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    print(f"[producer] Connecte a {args.broker}, topic cdr-stream, {args.rate} CDR/s")
    sent = 0
    try:
        while args.count == 0 or sent < args.count:
            cdr = pick(datetime.now())
            producer.send("cdr-stream", cdr)
            sent += 1
            tag = "FRAUDE?" if cdr["destination_country"] in RISKY else "legit"
            print(f"[{sent:05d}] {cdr['call_id'][:8]} {cdr['destination_country']} {cdr['call_duration_sec']}s {tag}")
            time.sleep(1.0 / args.rate)
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush()
        print(f"[producer] Termine : {sent} CDR publies")

if __name__ == "__main__":
    main()