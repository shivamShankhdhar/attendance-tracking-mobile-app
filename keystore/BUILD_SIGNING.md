# 🔐 Bizora Android Release Signing

> **KEEP THIS FILE SECRET — DO NOT COMMIT THE KEYSTORE TO GIT**

---

## Keystore Details

| Property | Value |
|---|---|
| **Keystore File** | `keystore/bizora-release.keystore` |
| **Keystore Format** | PKCS12 |
| **Key Alias** | `bizora-key` |
| **Key Algorithm** | RSA-4096 |
| **Signature Algorithm** | SHA384withRSA |
| **Owner** | CN=Shivam Shankhdhar, OU=Bizora Engineering, O=Bizora, L=India, ST=India, C=IN |
| **Created** | 2026-09-30 |
| **Valid Until** | 2054-02-15 |
| **Serial Number** | f6eee83b01dea0bc |

## Certificate Fingerprints

| Algorithm | Fingerprint |
|---|---|
| **SHA1** | `A8:C1:5B:7E:33:44:44:D5:27:4F:D2:5C:BC:63:C3:3A:F1:08:6A:55` |
| **SHA256** | `13:0D:33:BF:C0:01:E6:49:F7:44:36:49:8C:83:A6:9F:85:F4:16:30:FB:7B:58:CA:F3:C2:6B:C6:C5:1B:D3:07` |

## Credentials

| Property | Value |
|---|---|
| **Store Password** | `ShivamIsAnEngineerSince2021@` |
| **Key Password** | `ShivamIsAnEngineerSince2021@` |

---

## Building an AAB for the Play Store

```bash
# From the frontend/ directory
cd android
./gradlew bundleRelease --no-daemon
```

Output location:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Verifying the Signature

```bash
keytool -list -v \
  -keystore keystore/bizora-release.keystore \
  -alias bizora-key \
  -storepass 'ShivamIsAnEngineerSince2021@'
```

## Play Store Upload Instructions

1. Go to Google Play Console (https://play.google.com/console)
2. Create a new app -> App name: Bizora
3. Navigate to Production -> Create new release
4. Upload android/app/build/outputs/bundle/release/app-release.aab
5. The SHA-256 fingerprint above is required when configuring Google Sign-In credentials in the Google Cloud Console for production.

---

> SECURITY NOTES
> - The .keystore file is added to .gitignore -- never push it to a public repo.
> - Store this password in a secure vault (e.g., 1Password, Bitwarden).
> - Losing the keystore means you cannot update the app on the Play Store under the same listing.
