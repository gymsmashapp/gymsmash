import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, Play, Pause, X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function VideoRecorder({ onVideoRecorded, exerciseName }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [stream, setStream] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoPreviewRef = useRef(null);
  const liveVideoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stream]);

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      
      setStream(mediaStream);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp8'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.src = URL.createObjectURL(blob);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please grant camera permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, `${exerciseName}-${Date.now()}.webm`);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: recordedBlob });
      
      onVideoRecorded(file_url);
      
      // Reset
      setRecordedBlob(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video. Please try again.");
    }
    setIsUploading(false);
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = "";
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedBlob) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-semibold">Recording Preview</h4>
          <Button variant="ghost" size="sm" onClick={discardRecording} className="text-slate-400">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <video
          ref={videoPreviewRef}
          controls
          className="w-full rounded-lg bg-black"
          style={{ maxHeight: '300px' }}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Save Video'}
          </Button>
          <Button
            variant="outline"
            onClick={discardRecording}
            className="border-red-500 text-red-500 hover:bg-red-50"
          >
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center justify-center w-full">
        <Button
          onClick={stopRecording}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Recording
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <Button
        onClick={startRecording}
        size="sm"
        className="bg-[#C8102E] hover:bg-[#A00D25] text-white"
      >
        <Video className="w-4 h-4 mr-2" />
        Record Your Set
      </Button>
    </div>
  );
}