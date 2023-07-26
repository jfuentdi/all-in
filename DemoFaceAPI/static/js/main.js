document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('videoElement');
    const canvas = document.getElementById('canvasElement');
    const context = canvas.getContext('2d');
    let faceApiInterval; // Variable para almacenar el ID del intervalo de detección facial
    let videoWidth; // Variable para almacenar el ancho del video
    let videoHeight; // Variable para almacenar el alto del video

    // Objeto para mapear nombres de personas con URLs de imágenes de avatares
    const avatarMapping = {
        'Jorge': '/static/img/venom.jpg', // Ruta de la imagen del avatar para Nombre1
        'Nicolas': '/static/img/wolverine.jpg', // Ruta de la imagen del avatar para Nombre2
        // Agrega más nombres y rutas de avatares según sea necesario
    };

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            // Agregar el evento play para iniciar la detección facial en tiempo real
            video.addEventListener('play', () => {
                // Detener la detección facial si ya está en curso
                clearInterval(faceApiInterval);
                // Iniciar la detección facial en tiempo real
                faceApiInterval = setInterval(detectFacesInRealTime, 500); // Llamar cada 100ms
            });
        })
        .catch(error => console.log('Error al acceder a la cámara: ', error));

    function detectFacesInRealTime() {
        // Verificar si el video ha finalizado
        if (video.paused || video.ended) {
            clearInterval(faceApiInterval); // Detener la detección facial cuando el video se detenga
            return;
        }

        // Obtener el ancho y alto del video actual
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;

        // Dibujar el video en el canvas en cada cuadro
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Obtener los datos binarios de la imagen del video (cuadro actual)
        canvas.toBlob((blob) => {
            // Crear un objeto FormData para enviar el blob al backend
            const formData = new FormData();
            formData.append('image_data', blob);

            // Enviar los datos al backend mediante una solicitud POST usando Fetch API o Axios
            // Asegúrate de configurar la URL adecuadamente para que coincida con tu vista en Django.
            fetch('/detect_faces', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Manejar la respuesta del servidor con los resultados de detección de rostros
                console.log(data);
                // Aquí puedes dibujar los resultados en el canvas, por ejemplo, dibujar rectángulos alrededor de los rostros detectados.
                // Implementa el código para dibujar los resultados en el canvas
                drawRectanglesOnCanvas(data);
            })
            .catch(error => console.log('Error en la solicitud POST: ', error));
        }, 'image/jpeg');
    }

    function drawRectanglesOnCanvas(data) {
        // Limpiar el canvas antes de dibujar los rectángulos
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Limpiar el div de los nombres reconocidos antes de agregar nuevos nombres
        const recognizedNamesDiv = document.getElementById('recognizedNames');
        recognizedNamesDiv.innerHTML = '';

        // Aquí implementa el código para dibujar los rectángulos alrededor de los rostros detectados en el canvas.
        // Ajustar las coordenadas proporcionadas por Azure al espacio del canvas
        const videoRatio = videoWidth / videoHeight;
        const canvasRatio = canvas.width / canvas.height;
        const scale = canvas.width / videoWidth;

        data.forEach(face => {
            const { top, left, width, height } = face.faceRectangle;
            let adjustedTop = top * scale;
            let adjustedLeft = left * scale;
            let adjustedWidth = width * scale;
            let adjustedHeight = height * scale;

            // Dibujar el rectángulo rojo
            context.strokeStyle = 'red'; // Color del rectángulo
            context.lineWidth = 2; // Grosor del rectángulo
            context.strokeRect(adjustedLeft, adjustedTop, adjustedWidth, adjustedHeight);

            // Cargar el avatar en la esquina inferior derecha
            const avatarSize = 50; // Tamaño del avatar (ancho y alto)
            const avatarX = adjustedLeft + adjustedWidth - avatarSize; // Coordenada X para posicionar el avatar
            const avatarY = adjustedTop + adjustedHeight - avatarSize; // Coordenada Y para posicionar el avatar
            const avatarImg = new Image();
            avatarImg.src = avatarMapping[face.name] || '/static/img/default_avatar.jpg'; // Ruta del avatar según el nombre reconocido
            avatarImg.onload = () => {
                context.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
                console.log('Imagen del avatar cargada correctamente.');
            };

            // Agregar el nombre de la persona reconocida al div
            const recognizedName = document.createElement('p');
            recognizedName.textContent = face.name;
            recognizedNamesDiv.appendChild(recognizedName);
        });
    }

});