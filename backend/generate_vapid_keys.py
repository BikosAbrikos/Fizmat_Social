#!/usr/bin/env python3
"""Run once to generate VAPID keys, then add the output to backend/.env"""
import base64
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key
from cryptography.hazmat.primitives.serialization import (
    Encoding, NoEncryption, PrivateFormat, PublicFormat
)

private_key = generate_private_key(SECP256R1())
public_key = private_key.public_key()

private_pem = private_key.private_bytes(
    encoding=Encoding.PEM,
    format=PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=NoEncryption(),
)
public_raw = public_key.public_bytes(
    encoding=Encoding.X962,
    format=PublicFormat.UncompressedPoint,
)

print("Add these to your backend/.env file:\n")
print(f"VAPID_PRIVATE_KEY={base64.b64encode(private_pem).decode()}")
print(f"VAPID_PUBLIC_KEY={base64.urlsafe_b64encode(public_raw).decode().rstrip('=')}")
print(f"VAPID_CLAIM_EMAIL=mailto:admin@fizmat.kz")
