FROM python:3.9

WORKDIR /app
ADD requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

ADD app /app/app

CMD ["streamlit", "run", "app/main.py", "--server.port", "25000"]
