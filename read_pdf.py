import sys
try:
    import PyPDF2
except ImportError:
    import urllib.request
    import os
    os.system('pip install PyPDF2')
    import PyPDF2

def read_pdf(file_path):
    reader = PyPDF2.PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_pdf(sys.argv[1])
    else:
        read_pdf("Borrador final del hospital al ring Tavo libro (01).pdf")
