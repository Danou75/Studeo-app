
import { getYouTubeTranscript } from './services/youtubeService';

async function test() {
    const url = "https://www.youtube.com/watch?v=YcIbZGTRMjI";
    console.log("Testing URL:", url);
    const transcript = await getYouTubeTranscript(url);
    if (transcript) {
        console.log("Success! Transcript length:", transcript.length);
        console.log("First 100 chars:", transcript.slice(0, 100));
    } else {
        console.log("Failed to get transcript.");
    }
}

test();
