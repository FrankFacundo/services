"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { PlayCircle, PauseCircle, Volume2, VolumeX } from "lucide-react";

// Mock subtitle data
const subtitles = [
  { lang: "en", label: "English", url: "/path/to/english-subtitles.vtt" },
  { lang: "es", label: "Spanish", url: "/path/to/spanish-subtitles.vtt" },
  { lang: "fr", label: "French", url: "/path/to/french-subtitles.vtt" },
];

// Mock transcript data
const transcript = [
  { start: 0, end: 5, text: "Welcome to this video about React hooks." },
  {
    start: 5,
    end: 10,
    text: "Hooks are a powerful feature in React that allow you to use state and other React features without writing a class.",
  },
  { start: 10, end: 15, text: "Let's start by looking at the useState hook." },
  {
    start: 15,
    end: 20,
    text: "useState is used to add state to functional components.",
  },
  {
    start: 20,
    end: 25,
    text: "It returns an array with two elements: the current state value and a function to update it.",
  },
  { start: 25, end: 30, text: "Next, let's explore the useEffect hook." },
  {
    start: 30,
    end: 35,
    text: "useEffect allows you to perform side effects in your components.",
  },
  {
    start: 35,
    end: 40,
    text: "It runs after every render, but you can optimize it to run only when certain values change.",
  },
  { start: 40, end: 45, text: "Another useful hook is useContext." },
  {
    start: 45,
    end: 50,
    text: "useContext provides a way to pass data through the component tree without manually passing props.",
  },
];

export default function AdvancedVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSubtitle, setSelectedSubtitle] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    updateTime();
    updateDuration();

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  useEffect(() => {
    const transcriptElement = transcriptRef.current;
    if (!transcriptElement) return;

    const activeEntry = transcript.find(
      (entry) => currentTime >= entry.start && currentTime < entry.end
    );
    if (activeEntry) {
      const activeEntryElement = transcriptElement.querySelector(
        `[data-start="${activeEntry.start}"]`
      );
      activeEntryElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSubtitleChange = (value: string) => {
    setSelectedSubtitle(value);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = tracks[i].language === value ? "showing" : "hidden";
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        >
          {subtitles.map((subtitle) => (
            <track
              key={subtitle.lang}
              kind="subtitles"
              src={subtitle.url}
              srcLang={subtitle.lang}
              label={subtitle.label}
            />
          ))}
        </video>
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
            aria-label="Video progress"
          />
          <div className="flex items-center space-x-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseCircle className="h-6 w-6" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            <div className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <Select
              value={selectedSubtitle}
              onValueChange={handleSubtitleChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select subtitles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_subs">No subtitles</SelectItem>
                {subtitles.map((subtitle) => (
                  <SelectItem key={subtitle.lang} value={subtitle.lang}>
                    {subtitle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Transcript</h2>
        <ScrollArea className="h-60" ref={transcriptRef}>
          {transcript.map((entry) => (
            <p
              key={entry.start}
              data-start={entry.start}
              className={`py-1 ${
                currentTime >= entry.start && currentTime < entry.end
                  ? "bg-yellow-200"
                  : ""
              }`}
            >
              <span className="font-semibold">{`[${Math.floor(
                entry.start / 60
              )}:${(entry.start % 60).toString().padStart(2, "0")}] `}</span>
              {entry.text}
            </p>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
}
