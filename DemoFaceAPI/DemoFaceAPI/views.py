import base64
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import cv2
import requests
import face_recognition
import os


# Datos de la solicitud
subscription_key = '17803d7416184576acabc7fc82db3d5f'
face_api_url = 'https://chls1zu1acfarqpoccrit002.cognitiveservices.azure.com/face/v1.0/detect'

# Parámetros de la solicitud
params = {
    'detectionModel': 'detection_01'
}

# Encabezados de la solicitud
headers = {
    'Content-Type': 'application/octet-stream',
    'Ocp-Apim-Subscription-Key': subscription_key,
}

# Cargar las imágenes de entrenamiento y entrenar el modelo de reconocimiento facial
def train_facial_recognition_model():
    training_data_folder = 'static/faces_images'
    image_files = []
    labels = []

    for person_name in os.listdir(training_data_folder):
        person_folder = os.path.join(training_data_folder, person_name)
        for image_file in os.listdir(person_folder):
            image_path = os.path.join(person_folder, image_file)
            image = face_recognition.load_image_file(image_path)
            image_files.append(image)
            labels.append(person_name)

    # Entrenar el modelo
    known_encodings = [face_recognition.face_encodings(image)[0] for image in image_files]

    return known_encodings, labels

# Entrenar el modelo de reconocimiento facial
known_face_encodings, known_face_labels = train_facial_recognition_model()

def home(request):
    return render(request, 'index.html')

def procesar_resultados(results):
    processed_data = []
    for result in results:
        face_rectangle = result['faceRectangle']
        left, top, width, height = face_rectangle['left'], face_rectangle['top'], face_rectangle['width'], face_rectangle['height']
        processed_data.append({
            'left': left,
            'top': top,
            'width': width,
            'height': height
        })
    return processed_data

@csrf_exempt
def detect_faces(request):
    if request.method == 'POST':
        print("Received a POST request")  # Para verificar si llega la solicitud POST
        req_data = request.FILES.get('image_data')  # Obtener el archivo de imagen del formulario
        print("Image data:", req_data)  # Para verificar los datos de la imagen recibidos
        if req_data:
            # Leer los datos binarios del archivo de imagen
            try:
                image_bytes = req_data.read()
                image_array = np.frombuffer(image_bytes, dtype=np.uint8)
                frame = cv2.imdecode(image_array, flags=cv2.IMREAD_COLOR)
            except Exception as e:
                print("Error al decodificar la imagen:", e)
                return JsonResponse({'error': 'Error al decodificar la imagen.'})

            if frame is not None:
                # Realizar la detección facial en el frame
                _, img_encoded = cv2.imencode('.jpg', frame)
                response = requests.post(face_api_url, params=params, headers=headers, data=img_encoded.tobytes())

                # Obtener los resultados de la detección facial
                data = response.json()

                # Asociar nombres de personas reconocidas a los rostros detectados
                names = []
                for face_encoding in face_recognition.face_encodings(frame):
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
                    name = "Desconocido"  # Por defecto, si no se reconoce el rostro, se muestra como "Desconocido"
                    if True in matches:
                        index = matches.index(True)
                        name = known_face_labels[index]
                    names.append(name)

                # Agregar los nombres a los datos detectados
                for i, face_data in enumerate(data):
                    face_data['name'] = names[i]

                # Devolver los datos detectados con los nombres en la respuesta JSON
                return JsonResponse(data, safe=False)

            else:
                print("Frame de imagen vacío.")
                return JsonResponse({'error': 'Frame de imagen vacío.'})

    return JsonResponse({'error': 'No se ha recibido ningún dato para la detección facial.'})
