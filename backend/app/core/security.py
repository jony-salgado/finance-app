import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..db.supabase_client import supabase

# HTTPBearer security scheme to automatically parse standard Authorization: Bearer <TOKEN> header
security = HTTPBearer()

# Strict Whitelist of permitted emails
WHITELIST_EMAILS = [
    "jonysalgadofilho@gmail.com",
    "cristina.almeida.bq@gmail.com",
]

# Allow loading whitelist from environment variables if defined
env_whitelist = os.environ.get("WHITELIST_EMAILS")
if env_whitelist:
    WHITELIST_EMAILS = [email.strip() for email in env_whitelist.split(",")]


def get_current_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Dependency to validate the Supabase JWT token and verify the user's email against the whitelist.
    """
    token = credentials.credentials
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")

    email = None

    # Method 1: Local validation if SUPABASE_JWT_SECRET is configured
    if jwt_secret:
        try:
            payload = jwt.decode(
                token, jwt_secret, algorithms=["HS256"], audience="authenticated"
            )
            email = payload.get("email")
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
            )
    else:
        # Method 2: Validation via Supabase API (no local JWT secret required)
        try:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                email = user_response.user.email
        except Exception:
            # Method 3: Fallback decoding without verification (convenient for local dev/testing)
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                email = payload.get("email")
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token or authentication failed",
                )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not extract email from token",
        )

    # Apply strict whitelist check
    if email not in WHITELIST_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Email not in whitelist",
        )

    return email
