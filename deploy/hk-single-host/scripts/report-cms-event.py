#!/usr/bin/env python3
"""Send one least-privilege Alibaba Cloud CMS custom event."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone


CMS_ENDPOINT = "https://metrics.cn-hangzhou.aliyuncs.com/"
API_VERSION = "2019-01-01"
SIGNATURE_METHOD = "HMAC-SHA1"


def percent_encode(value: object) -> str:
    return urllib.parse.quote(str(value), safe="~")


def signed_url(params: dict[str, str], access_key_secret: str) -> str:
    canonical = "&".join(
        f"{percent_encode(key)}={percent_encode(value)}"
        for key, value in sorted(params.items())
    )
    string_to_sign = f"GET&%2F&{percent_encode(canonical)}"
    signature = base64.b64encode(
        hmac.new(
            f"{access_key_secret}&".encode(),
            string_to_sign.encode(),
            hashlib.sha1,
        ).digest()
    ).decode()
    signed = {**params, "Signature": signature}
    query = "&".join(
        f"{percent_encode(key)}={percent_encode(value)}"
        for key, value in sorted(signed.items())
    )
    return f"{CMS_ENDPOINT}?{query}"


def send_event(event_name: str, content: str) -> None:
    access_key_id = os.environ.get("ALIBABA_CLOUD_ACCESS_KEY_ID", "")
    access_key_secret = os.environ.get("ALIBABA_CLOUD_ACCESS_KEY_SECRET", "")
    if not access_key_id or not access_key_secret:
        raise SystemExit("CMS reporter credentials are not configured")
    if not event_name or len(event_name) > 128:
        raise SystemExit("invalid CMS event name")
    if len(content.encode()) > 4096:
        raise SystemExit("CMS event content exceeds 4096 bytes")

    params = {
        "AccessKeyId": access_key_id,
        "Action": "PutCustomEvent",
        "EventInfo.1.Content": content,
        "EventInfo.1.EventName": event_name,
        "EventInfo.1.GroupId": "0",
        "EventInfo.1.Time": str(int(time.time() * 1000)),
        "Format": "JSON",
        "SignatureMethod": SIGNATURE_METHOD,
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "Version": API_VERSION,
    }
    request = urllib.request.Request(
        signed_url(params, access_key_secret),
        headers={"Accept": "application/json", "User-Agent": "paperbanana-health-monitor/1"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise SystemExit(f"CMS event request failed: {type(error).__name__}") from error

    success = payload.get("Success")
    if success not in (True, "true", "True") and str(payload.get("Code")) != "200":
        raise SystemExit("CMS rejected the custom event")
    print("CMS custom event accepted")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event-name", required=True)
    parser.add_argument("--content", required=True)
    args = parser.parse_args()
    send_event(args.event_name, args.content)


if __name__ == "__main__":
    main()
