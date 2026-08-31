import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DoctorAssistantApp = () => {
  const [page, setPage] = useState("home");

  const [profile, setProfile] = useState({
    name: "",
    surname: "",
    age: "",
    field: "",
    email: "",
    summary: ""
  });

  const [newHistory, setNewHistory] = useState({
    patientName: "",
    patientAge: "",
    patientID: "",
    symptoms: ""
  });

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleHistoryChange = (field, value) => {
    setNewHistory(prev => ({ ...prev, [field]: value }));
  };

  const renderHome = () => (
    <div className="p-4 flex flex-col gap-4">
      <Button onClick={() => setPage("profile")}>My Profile</Button>
      <Button onClick={() => setPage("correspondence")}>My Correspondences</Button>
      <Button onClick={() => setPage("history")}>Patient Medical Histories</Button>
    </div>
  );

  const renderProfile = () => (
    <div className="p-4 flex flex-col gap-2">
      <Input placeholder="Name" value={profile.name} onChange={e => handleProfileChange("name", e.target.value)} />
      <Input placeholder="Surname" value={profile.surname} onChange={e => handleProfileChange("surname", e.target.value)} />
      <Input placeholder="Age" value={profile.age} onChange={e => handleProfileChange("age", e.target.value)} />
      <Input placeholder="Professional Field" value={profile.field} onChange={e => handleProfileChange("field", e.target.value)} />
      <Input placeholder="Email" value={profile.email} onChange={e => handleProfileChange("email", e.target.value)} />
      <Textarea placeholder="Short Summary" value={profile.summary} onChange={e => handleProfileChange("summary", e.target.value)} />
      <Button onClick={() => setPage("home")}>Back</Button>
    </div>
  );

  const renderCorrespondence = () => (
    <div className="p-4">
      <p>This page will be developed later.</p>
      <Button onClick={() => setPage("home")}>Back</Button>
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 flex flex-col gap-3">
      <Button onClick={() => setPage("createHistory")}>+ Create New Medical History</Button>
      <Input placeholder="Search by Patient ID" className="mt-2" />
      <Button onClick={() => alert("Search function coming soon!")}>Search</Button>
      <Button onClick={() => setPage("home")}>Back</Button>
    </div>
  );

  const renderCreateHistory = () => (
    <div className="p-4 flex flex-col gap-3">
      <Input placeholder="Patient Name" value={newHistory.patientName} onChange={e => handleHistoryChange("patientName", e.target.value)} />
      <Input placeholder="Patient Age" value={newHistory.patientAge} onChange={e => handleHistoryChange("patientAge", e.target.value)} />
      <Input placeholder="Patient ID" value={newHistory.patientID} onChange={e => handleHistoryChange("patientID", e.target.value)} />
      <Textarea placeholder="Symptoms and Anamnesis" value={newHistory.symptoms} onChange={e => handleHistoryChange("symptoms", e.target.value)} />
      <Button onClick={() => alert("Sending info to AI... (coming soon)")}>Consult with AI</Button>
      <Button onClick={() => setPage("history")}>Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      {page === "home" && renderHome()}
      {page === "profile" && renderProfile()}
      {page === "correspondence" && renderCorrespondence()}
      {page === "history" && renderHistory()}
      {page === "createHistory" && renderCreateHistory()}
    </div>
  );
};

export default DoctorAssistantApp;
