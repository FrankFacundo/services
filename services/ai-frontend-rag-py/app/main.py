import base64
import json
import os

import httpx
import requests
import streamlit as st
from streamlit_extras.add_vertical_space import add_vertical_space
from streamlit_option_menu import option_menu
from translate import Translate

IP_SERVER = os.getenv("VA__IP_SERVER")
PORT_BACKEND = os.getenv("PORT_BACKEND")
VA__API_KEY = os.getenv("VA__API_KEY")

translate = Translate()
tr = translate.translate

with st.sidebar:
    st.title(tr("title"))
    selected = option_menu(
        "Assistant tasks",
        ["Chatbot V2", "Chatbot", "Documents" "Mail", "Summary", "Text to SQL"],
        icons=["chat-dots", "files", "envelope", "blockquote-left", "filetype-sql"],
        default_index=0,
    )

    st.markdown(tr("about"))

    add_vertical_space(1)
    st.write("Chatbot 🤖 Bridge Data")


hide_streamlit_style = """
            <style>
            #MainMenu {visibility: hidden;}
            footer {visibility: hidden;}
            </style>
            """

st.markdown(hide_streamlit_style, unsafe_allow_html=True)

endpoint_address = f"http://{IP_SERVER}:{PORT_BACKEND}"
headers = {"Content-Type": "application/json", "Authorization": VA__API_KEY}

if "messages" not in st.session_state:
    st.session_state.messages = []

if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = None

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

DEFAULT_USER_ID = "93de29f7-2223-42ff-8c5f-e7ee699b5e46"

if selected == "Chatbot V2":
    url_streaming = f"{endpoint_address}/generate"
    url_context = f"{endpoint_address}/get_relevant_context"
    print("url_context: ", url_context)

    if prompt := st.chat_input("Adk your question"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            if st.session_state.conversation_id:
                json_data = {
                    "prompt": prompt,
                    "user_id": DEFAULT_USER_ID,
                    "conversation_id": st.session_state.conversation_id,
                }
            else:
                json_data = {"prompt": prompt, "user_id": DEFAULT_USER_ID}

            with httpx.stream(
                "POST", url_streaming, headers=headers, json=json_data
            ) as response:
                for jsonb_text in response.iter_raw():
                    json_text = jsonb_text.decode().rstrip("\0")
                    dict_text = json.loads(json_text)
                    response = dict_text["text"][0]
                    if dict_text["conversation_id"]:
                        st.session_state.conversation_id = dict_text["conversation_id"]
            message_streaming = st.markdown(response)

        st.session_state.messages.append({"role": "assistant", "content": response})

if selected == "Chatbot":
    st.title("Chat with your documents")
    prompt = st.text_input("What is your question on your private documents?")

    if prompt:
        url_streaming = f"{endpoint_address}/generate"
        url_context = f"{endpoint_address}/get_relevant_context"
        print("url_context: ", url_context)

        json_data = {"prompt": prompt, "user_id": DEFAULT_USER_ID}

        s = requests.Session()

        context = requests.post(url_context, headers=headers, json=json_data).json()

        message_streaming = st.empty()

        with st.expander("Context"):
            for i, doc in enumerate(context):
                st.write(f"Source Document # {i+1} : {doc['metadata']['source']}")
                st.write(doc["page_content"])
                st.write("-------------------------")

        full_response = ""
        message_streaming.markdown("...")

        with httpx.stream(
            "POST",
            url_streaming,
            headers=headers,
            json=json_data,
        ) as response:
            for jsonb_text in response.iter_raw():
                json_text = jsonb_text.decode().rstrip("\0")
                dict_text = json.loads(json_text)
                response = dict_text["text"][0]
                message_streaming.markdown(response + "...")

        message_streaming.markdown(response)

if selected == "Documents":
    st.title("Documents")
    path_directory = os.getcwd()
    path_docs = os.path.join(path_directory, "data")
    if not os.path.exists(path_docs):
        os.makedirs(path_docs)

    url_docs_structure = f"{endpoint_address}/get_documents_metadata"
    docs_structure = requests.get(url_docs_structure, headers=headers).json()
    for document in docs_structure:
        with st.expander(document, expanded=False) as expander:
            document_path = os.path.join(path_docs, document)
            print("document_path :", document_path)
            if not os.path.exists(document_path):
                s = requests.Session()
                url_download_pdf = f"{endpoint_address}/download/{document}"
                print("url_download_pdf: ", url_download_pdf)
                with s.get(url_download_pdf, headers=headers) as response:
                    response.raise_for_status()

                    with open(document_path, "wb") as file:
                        file.write(response.content)
            with open(document_path, "rb") as file:
                base64_pdf = base64.b64encode(file.read()).decode("utf-8")

            pdf_display = f"""
            <iframe
                src="data:application/pdf;base64,{base64_pdf}"
                width="100%" height="1000"
                type="application/pdf"
                style="min-width: 400px;"
            >
            </iframe>
            """

            st.markdown(pdf_display, unsafe_allow_html=True)
