"use client";

import Image from "next/image";
import { useState } from "react";
import PlaceAutocomplete from "../components/PlaceAutocomplete";
import JacketScore from "../components/JacketScore";
import ClipLoader from "react-spinners/ClipLoader";

export default function Home() {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [venueType, setVenueType] = useState("");
  const [duration, setDuration] = useState(1);
  const [arrivalTime, setArrivalTime] = useState(""); // New state for arrival time
  const [gender, setGender] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [jacketScore, setJacketScore] = useState(null);
  const [showResults, setShowResults] = useState(false); // To toggle between input and results

  const now = new Date();
  const hoursArray = [...Array(12).keys()].map((i) => {
    const newHour = new Date();
    newHour.setHours(now.getHours() + i, 0, 0);
    return newHour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    setErrorMessage("");
  };

  const handleVenueTypeSelect = (type) => setVenueType(type);
  const handleGenderSelect = (selectedGender) => setGender(selectedGender);

  // Function to fetch weather data from your API
  const fetchWeather = async (lat, lon, timestamp) => {
    try {
      const response = await fetch(
        `/api/getWeather?lat=${lat}&lon=${lon}&timestamp=${timestamp}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch weather data");
      }
      const data = await response.json();
      // Round temperature and wind speed
      data.temp = Math.round(data.temp);
      data.windSpeed = Math.round(data.windSpeed);
      setWeatherData(data); // Save the weather data
      return data;
    } catch (error) {
      setErrorMessage(error.message);
      return null;
    }
  };

  // Round to nearest 3-hour interval
  const roundToNearestThreeHours = (date) => {
    const msInThreeHours = 3 * 60 * 60 * 1000;
    return new Date(Math.round(date.getTime() / msInThreeHours) * msInThreeHours);
  };

  const handleJacketScore = async () => {
    if (selectedPlace && venueType && arrivalTime && duration && gender) {
      setIsLoading(true); // Start loading
      setErrorMessage(""); // Clear any previous errors
      setRecommendation(null);
      setJacketScore(null);

      const lat = selectedPlace.geometry?.location.lat();
      const lon = selectedPlace.geometry?.location.lng();

      // Ensure that `arrivalTime` is valid
      if (!arrivalTime) {
        setErrorMessage("Please select a valid arrival time.");
        setIsLoading(false);
        return;
      }

      // Ensure time splitting is safe by handling 12-hour format conversion
      const [hoursPart, modifier] = arrivalTime.split(" "); // Handle AM/PM part
      const [hoursStr, minutesStr] = hoursPart.split(":");
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      // Correct for PM time format
      if (modifier === "PM" && hours !== 12) {
        hours += 12;
      } else if (modifier === "AM" && hours === 12) {
        hours = 0; // Midnight case
      }

      // Check for invalid times
      if (isNaN(hours) || isNaN(minutes)) {
        setErrorMessage("Invalid time selected.");
        setIsLoading(false);
        return;
      }

      // Calculate the timestamp for the arrival time
      const now = new Date();
      const arrivalDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes
      );

      // Round the arrival time to the nearest 3-hour interval
      const roundedArrivalTime = roundToNearestThreeHours(arrivalDateTime);
      const arrivalTimestamp = Math.floor(roundedArrivalTime.getTime() / 1000);

      // Fetch the weather data based on selected place's coordinates and rounded arrival time
      const weather = await fetchWeather(lat, lon, arrivalTimestamp);

      if (weather) {
        // Prepare data for ChatGPT
        const chatGPTBody = {
          location: selectedPlace.name,
          time: arrivalTime,
          duration,
          temperature: weather.temp,
          wind: weather.windSpeed,
          precipitation: weather.precipitation,
          venueType,
        };

        // Add gender if it's not "Prefer Not to Say"
        if (gender !== "Prefer Not to Say") {
          chatGPTBody.gender = gender;
        }

        // Fetch recommendation from ChatGPT
        try {
          const response = await fetch("/api/getChatGPTRecommendation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chatGPTBody),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch recommendation");
          }

          const data = await response.json();
          setRecommendation(data.recommendation);
        } catch (error) {
          setErrorMessage(error.message);
        }

        // Prepare data for jacket score calculation
        const scoreBody = {
          temperature: weather.temp,
          windSpeed: weather.windSpeed,
          precipitation: weather.precipitation,
          venueType,
        };

        // Fetch the jacket score
        try {
          const response = await fetch("/api/calculateJacketScore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(scoreBody),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to calculate jacket score");
          }

          const data = await response.json();
          setJacketScore(data.score);
        } catch (error) {
          setErrorMessage(error.message);
        }
      }

      setIsLoading(false); // End loading
      setShowResults(true); // Show the results section
    } else {
      alert("Please fill in all the required fields.");
    }
  };

  const handleEdit = () => {
    setShowResults(false);
    setErrorMessage("");
  };

  const getButtonClass = (isSelected) => {
    return `button ${isSelected ? "selected" : ""}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20 font-sans dark:bg-black dark:text-white">
      <main className="flex flex-col gap-8 items-center w-full max-w-lg text-center">
        {/* Image */}
        <Image
          src="/images/jacketscore-logo.png"
          alt="JacketScore logo"
          width={175} // Smaller logo size
          height={40}
          priority
        />
  
        {!showResults && (
          <>
            <h1 className="text-4xl font-extrabold mb-4">Do You Need a Jacket?</h1>
            <p className="mb-4">
              Use JacketScore, powered by AI, to decide if you&apos;ll need a jacket based on your location, weather, and duration of stay.
            </p>
          </>
        )}
  
        {errorMessage && (
          <div className="mt-4 text-red-500">
            <p>Error: {errorMessage}</p>
          </div>
        )}
  
        {!showResults ? (
          <>
            <div className="w-full text-left">
              <label className="block mb-2 text-lg font-semibold text-center">Where are you going?</label>
              <PlaceAutocomplete onSelect={handlePlaceSelect} />
            </div>
  
            <div className="mt-6 w-full">
              <label className="block mb-2 text-lg font-semibold">Are you staying indoors or outdoors?</label>
              <div className="flex space-x-4 justify-center">
                <button
                  className={getButtonClass(venueType === "Indoors")}
                  onClick={() => handleVenueTypeSelect("Indoors")}
                >
                  <span className="button-content">Indoors</span>
                </button>
                <button
                  className={getButtonClass(venueType === "Outdoors")}
                  onClick={() => handleVenueTypeSelect("Outdoors")}
                >
                  <span className="button-content">Outdoors</span>
                </button>
              </div>
            </div>
  
            <div className="mt-6 w-full">
              <label className="block mb-2 text-lg font-semibold">What time are you arriving?</label>
              <input
                type="range"
                min="0"
                max="11"
                value={hoursArray.indexOf(arrivalTime)}
                onChange={(e) => setArrivalTime(hoursArray[e.target.value])}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"
              />
              <div className="text-center text-sm mt-2 font-semibold">Arrival Time: {arrivalTime || hoursArray[0]}</div>
            </div>
  
            <div className="mt-6 w-full">
              <label className="block mb-2 text-lg font-semibold">How long will you be staying? (hours)</label>
              <input
                type="range"
                min="1"
                max="12"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"
              />
              <div className="text-center text-sm mt-2 font-semibold">Duration: {duration} hours</div>
            </div>
  
            <div className="mt-6 w-full">
              <label className="block mb-2 text-lg font-semibold">What is your gender?</label>
              <div className="flex space-x-4 justify-center">
                <button
                  className={getButtonClass(gender === "Male")}
                  onClick={() => handleGenderSelect("Male")}
                >
                  <span className="button-content">Male</span>
                </button>
                <button
                  className={getButtonClass(gender === "Female")}
                  onClick={() => handleGenderSelect("Female")}
                >
                  <span className="button-content">Female</span>
                </button>
                <button
                  className={getButtonClass(gender === "Prefer Not to Say")}
                  onClick={() => handleGenderSelect("Prefer Not to Say")}
                >
                  <span className="button-content">Prefer Not to Say</span>
                </button>
              </div>
            </div>
  
            <div className="mt-6 w-full">
              <button
                className="button w-full flex items-center justify-center"
                onClick={handleJacketScore}
                disabled={isLoading}
              >
                <span className="button-content">
                  {isLoading ? (
                    <>
                      <ClipLoader size={20} color={"#ffffff"} loading={isLoading} />
                      <span className="ml-2">Calculating...</span>
                    </>
                  ) : (
                    "Get Jacket Score"
                  )}
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 w-full">
              <h2 className="text-3xl font-extrabold">Your Jacket Score</h2>
              {jacketScore !== null && <JacketScore score={jacketScore} />}
              {recommendation && (
                <div className="mt-4">
                  <h2 className="text-2xl">Recommendation</h2>
                  <p>{recommendation}</p>
                </div>
              )}
              {weatherData && (
                <div className="mt-4">
                  <h2 className="text-2xl">Weather Information</h2>
                  <div className="flex flex-col items-center">
                    {weatherData.iconCode && (
                      <Image
                        src={`https://openweathermap.org/img/wn/${weatherData.iconCode}@2x.png`}
                        alt={weatherData.precipitation}
                        width={100}
                        height={100}
                      />
                    )}
                    <p>Temperature: {weatherData.temp ? `${Math.round(weatherData.temp)}°F` : "N/A"}</p>
                    <p>Wind Speed: {weatherData.windSpeed ? `${Math.round(weatherData.windSpeed)} mph` : "N/A"}</p>
                    <p>Precipitation: {weatherData.precipitation ?? "N/A"}</p>
                  </div>
                </div>
              )}
              <div className="mt-4 w-full">
                <button
                  className={getButtonClass(false)}
                  onClick={handleEdit}
                >
                  <span className="button-content">Edit Inputs</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );  
}
