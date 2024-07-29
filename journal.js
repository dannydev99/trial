let isRecording = false; // Flag to check if recording is active
let isPaused = false; // Flag to check if recording is paused
let recognition; // Variable to hold the speech recognition object
let transcriptText = document.getElementById('transcriptText'); // Element to display the transcription text
let entriesList = document.getElementById('entriesList'); // Element to display the list of journal entries
let finalTranscript = ''; // Variable to hold the final transcription text
let mediaRecorder; // Variable to hold the media recorder object
let recordedChunks = []; // Array to store audio data chunks
let startTime; // Variable to store the start time of recording
let recordingInterval; // Variable to hold the setInterval for recording time

const recordButton = document.getElementById('recordButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');

// Event listeners for the buttons
recordButton.addEventListener('click', startRecording);
pauseButton.addEventListener('click', pauseRecording);
stopButton.addEventListener('click', stopRecording);

// Check if the Web Speech API is supported
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // Continue capturing speech even when the user pauses
    recognition.interimResults = true; // Show interim results before the final transcription
    recognition.lang = 'en-US'; // Set the language to English (US)

    recognition.onresult = (event) => {
        let interimTranscript = ''; // Variable to hold the interim transcription
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' '; // Append final transcription
            } else {
                interimTranscript += event.results[i][0].transcript; // Append interim transcription
            }
        }

        // Display the final and interim transcriptions
        transcriptText.innerHTML = finalTranscript + '<span style="color: #999;">' + interimTranscript + '</span>';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error detected: ' + event.error); // Log any errors
    };

    recognition.onend = () => {
        if (isRecording && !isPaused) {
            recognition.start(); // Restart recognition if it ends unexpectedly
        }
    };
} else {
    console.warn('Web Speech API not supported in this browser.');
}

// Function to start recording
function startRecording() {
    if (recognition) {
        recognition.start(); // Start speech recognition
        isRecording = true;
        updateButtons(); // Update button states
    }
    
    // Access the user's microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream); // Create a media recorder object
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data); // Store audio data chunks
                }
            };
            mediaRecorder.start(); // Start recording audio
            startTime = Date.now(); // Store the start time of recording
            recordingInterval = setInterval(updateRecordingTime, 1000); // Update the recording time every second
            recordingIndicator.style.display = 'block'; // Show the recording indicator
        })
        .catch(error => {
            console.error('Error accessing audio devices.', error); // Log any errors
        });
}

// Function to pause recording
function pauseRecording() {
    if (mediaRecorder) {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause(); // Pause the media recorder
            recognition.stop(); // Stop the speech recognition temporarily
            isPaused = true;
            pauseButton.textContent = 'Resume Recording'; // Change the pause button text to resume
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume(); // Resume the media recorder
            recognition.start(); // Restart the speech recognition
            isPaused = false;
            pauseButton.textContent = 'Pause Recording'; // Change the resume button text to pause
        }
    }
}

// Function to stop recording
function stopRecording() {
    if (recognition) {
        recognition.stop(); // Stop speech recognition
        isRecording = false;
        updateButtons(); // Update button states
    }
    if (mediaRecorder) {
        mediaRecorder.stop(); // Stop audio recording
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' }); // Create a blob from the recorded audio
            const audioUrl = URL.createObjectURL(audioBlob); // Create a URL for the audio file
            const currentDate = new Date().toLocaleString(); // Get the current date and time
            addEntry(finalTranscript.trim(), audioUrl, currentDate); // Add the entry to the journal
            recordedChunks = []; // Clear the recorded chunks
            finalTranscript = ''; // Clear the final transcription
            transcriptText.textContent = ''; // Clear the transcription display
            clearInterval(recordingInterval); // Clear the recording interval
            recordingIndicator.style.display = 'none'; // Hide the recording indicator
            recordingTime.textContent = '0:00'; // Reset the recording time display
        };
    }
}

// Function to update the states of the buttons
function updateButtons() {
    recordButton.disabled = isRecording;
    pauseButton.disabled = !isRecording;
    stopButton.disabled = !isRecording;
    pauseButton.textContent = isPaused ? 'Resume Recording' : 'Pause Recording';
}

// Function to update the recording time display
function updateRecordingTime() {
    const elapsed = Date.now() - startTime; // Calculate the elapsed time
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    recordingTime.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; // Update the recording time display
}

// Function to add an entry to the journal
function addEntry(entryText, audioUrl, date) {
    const entryItem = document.createElement('li');
    entryItem.innerHTML = `
        <p>${entryText}</p>
        <audio controls>
            <source src="${audioUrl}" type="audio/wav">
            Your browser does not support the audio element.
        </audio>
        <div class="entry-date">${date}</div>
    `;
    entriesList.appendChild(entryItem); // Add the entry to the list
    sortEntriesByDate(); // Sort the entries by date
}

// Function to sort the entries by date
function sortEntriesByDate() {
    const entries = Array.from(entriesList.children); // Convert the list to an array
    entries.sort((a, b) => {
        const dateA = new Date(a.querySelector('.entry-date').textContent); // Get the date of entry A
        const dateB = new Date(b.querySelector('.entry-date').textContent); // Get the date of entry B
        return dateB - dateA; // Sort in descending order (newest first)
    });
    entriesList.innerHTML = ''; // Clear the list
    entries.forEach(entry => entriesList.appendChild(entry)); // Append the sorted entries
}
