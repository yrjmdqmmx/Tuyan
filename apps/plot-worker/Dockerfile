FROM python:3.12-slim

# Headless matplotlib, no .pyc clutter, unbuffered logs.
ENV MPLBACKEND=Agg \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MPLCONFIGDIR=/tmp/mpl

WORKDIR /app

# System libs matplotlib needs at runtime (freetype/png). build-essential is
# only needed transiently for any source wheels, then removed to slim the image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6 libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py production_auth.py render_worker.py ./

# Non-root user. The child render process inherits this uid; combined with the
# RLIMIT_* caps and a deployment-level no-egress boundary this is the intended
# posture (Kubernetes NetworkPolicy or the single-host Compose firewall).
RUN useradd --create-home --uid 10001 plot \
    && mkdir -p /tmp/mpl \
    && chown -R plot:plot /app /tmp/mpl
USER plot

# Warm the matplotlib font cache as the non-root user so the first real
# request is not slowed by cache generation under tight RLIMIT_CPU.
RUN python -c "import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt; plt.plot([0,1]); plt.close('all')"

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
