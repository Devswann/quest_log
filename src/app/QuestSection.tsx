"use client";
import React, { FormEvent, useEffect, useState } from "react";

type Quest = {
    id: number;
    questName: string;
    description: string;
    section: string;
    isComplete: boolean;
}

export default function QuestSection() {


    const [questList, setQuestList] = useState<Quest[]>([]);
    const activeQuestList = questList.filter(q => !q.isComplete);
    const completedQuestList = questList.filter(q => q.isComplete);
    const [newQuestName, setNewQuestName] = useState("");
    const [newQuestDescription, setNewQuestDescription] = useState("");
    const [newQuestSection, setNewQuestSection] = useState("");
    const [errorFlag, setErrorFLag] = useState(false);

    const addQuest = (e: React.FormEvent) => {
        e.preventDefault();

        const isInvalid = newQuestName.trim() === "" || newQuestDescription.trim() === "";

        if (isInvalid) {
            setErrorFLag(true);
            return;
        }

        setErrorFLag(false);

        const newQuest:Quest = {
            id: questList.length,
            questName: newQuestName ,
            description: newQuestDescription,
            section: newQuestSection,
            isComplete: false
        };

        setQuestList((prev) => [...prev, newQuest]);
        setNewQuestName("");
        setNewQuestDescription("");
        setNewQuestSection("");
    }

    const completeQuest = (quest:Quest) => {
        console.log('quest', questList[quest.id])
        questList[quest.id].isComplete = true;
        const updateList = [...questList];
        console.log('list', updateList, 'id', quest.id);
        setQuestList((questList) => [...questList])
    }

    useEffect(() => {
        setQuestList((questList) => [
            ...questList,
            {
                id: 0,
                questName: "Beginner Quest",
                description: "This is a beginner quest and it's description",
                section: "Home",
                isComplete: false,
            },
        ]);
    }, []);

    return (
        <React.Fragment>
            <div className="bg-gray-100 min-h-screen flex items-center justify-center">
                <div className="border-2 bg-white p-8 rounded-xl shadow-lg w-full max-w-3xl">
                    <div className="component-panel flex-row">
                        <h1 className="text-3xl mb-4">Quest Section</h1>
                            <p>Please add your new quest below for tracking</p>
                            <label className="font-bold" htmlFor="questName">Name: </label>
                            <input name="newQuestName" id="newQuestName" placeholder="Name" onChange={e => setNewQuestName(e.target.value)} />
                            <br/>
                            <label className="font-bold" htmlFor="description">Description: </label>
                            <input name="newQuestDescription" id="newQuestDescription" placeholder="Description" onChange={e => setNewQuestDescription(e.target.value)} />
                            <label className="font-bold" htmlFor="section">Section: </label>
                            <input name="newQuestSection" id="newQuestSection" placeholder="Section" onChange={e => setNewQuestSection(e.target.value)} />
                            <br></br>
                            <button className="btn-primary" onClick={addQuest}>Submit</button>
                    </div>
                    <div className="component-panel flex">
                        <div className="flex-6">
                            <h2>Active Quests</h2>
                            <ul>
                                {activeQuestList.map(quest => (
                                    <li key={quest.id}>
                                        <h3><b>Name:</b> {quest.questName}</h3>
                                        <p><b>Description:</b> {quest.description}</p>
                                        <p><b>Section:</b> {quest.section}</p>
                                        <p><b>ID:</b> {quest.id}</p>
                                        <p><b>Completed:</b> {quest.isComplete ? "Yes" : "No"}</p> 
                                        <button className="btn-primary" hidden={quest.isComplete} onClick={() => completeQuest(quest)}>Complete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-6">
                            <h2>Completed Quests</h2>
                            <ul>
                                {completedQuestList.map(quest => (
                                    <li key={quest.id}>
                                        <h3>Name: {quest.questName}</h3>
                                        <p>Description: {quest.description}</p>
                                        <p>ID: {quest.id}</p>
                                        <p>Completed: {quest.isComplete ? "Yes" : "No"}</p> 
                                        <button className="btn-primary" hidden={quest.isComplete} onClick={() => completeQuest(quest)}>Complete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            
        </React.Fragment>
    )

}
