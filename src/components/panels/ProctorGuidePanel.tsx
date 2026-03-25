"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type ShiftType =
    | "loading"
    | "morning"
    | "afternoon"
    | "full-day"
    | "unassigned";

export default function ProctorGuidePanel() {
    const [shift, setShift] = useState<ShiftType>("loading");
    const [rooms, setRooms] = useState<{
        morning: number | null;
        afternoon: number | null;
    }>({
        morning: null,
        afternoon: null,
    });

    useEffect(() => {
        const fetchAssignment = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                setShift("unassigned");
                return;
            }

            const { data, error } = await supabase
                .from("user_roles")
                .select("morning_room, afternoon_room")
                .eq("id", user.id)
                .single();

            if (error || !data) {
                setShift("unassigned");
                return;
            }

            setRooms({
                morning: data.morning_room,
                afternoon: data.afternoon_room,
            });

            if (data.morning_room && data.afternoon_room) {
                setShift("full-day");
            } else if (data.morning_room) {
                setShift("morning");
            } else if (data.afternoon_room) {
                setShift("afternoon");
            } else {
                setShift("unassigned");
            }
        };

        fetchAssignment();
    }, []);

    if (shift === "loading") {
        return (
            <div className="p-8 text-center text-gray-500 animate-pulse mt-10">
                Loading your specific proctor guide...
            </div>
        );
    }

    if (shift === "unassigned") {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 mt-8">
                You do not currently have any rooms assigned. Please contact an
                administrator to get your schedule.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="pt-8">
                <div className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 text-gray-600 space-y-4">
                    <div className="mb-8 border-b border-gray-200 pb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Proctor Guide
                        </h2>
                        <div className="flex flex-col md:flex-row gap-3 mt-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize tracking-wide">
                                {shift}
                            </span>
                            {rooms.morning && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                    Morning: Room {rooms.morning}
                                </span>
                            )}
                            {rooms.afternoon && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                    Afternoon: Room {rooms.afternoon}
                                </span>
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800">
                        Before the Tournament
                    </h3>
                    <p>
                        Please read through the proctor guide and ensure you
                        understand everything. Make sure you&apos;ve joined the
                        Remind group (join code is{" "}
                        <span className="font-mono">smst2026</span>). The dress
                        code for volunteers is business casual (e.g., jeans and
                        sweater). No sweatpants please!
                    </p>
                    <p>
                        In the volunteer portal (the website you&apos;re on
                        right now), make sure your role is set to
                        &quot;Proctor&quot; in the upper left. You should see
                        the schedule on the left with your assigned rooms and an
                        attendance panel at the top. If you have any questions
                        about using the volunteer portal, please contact Thomas
                        Ha at{" "}
                        <span className="font-mono">
                            tha2026@sharonschools.net
                        </span>
                        .
                    </p>
                    <p>
                        On the day of the event, please remember to bring a
                        laptop and charger.{" "}
                        <strong>
                            For any issues you have on tournament day, please
                            text Sophie Liang on Remind.
                        </strong>
                    </p>

                    {(shift === "morning" || shift === "full-day") && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Morning Check-In
                            </h3>
                            <p>
                                Please arrive at the school at 8:10 AM through
                                the front doors. Go to the STEAM room and find{" "}
                                <strong>Unnimaya Sajeev or Sophie Liang</strong>{" "}
                                to check in. Once you are checked in, head to
                                your assigned room listed on the volunteer
                                portal.
                            </p>
                            <p>
                                Check that there are three manila folders in
                                your room (containing math rounds &amp; answer
                                sheets; science rounds &amp; answer sheets; and
                                team rounds, answer sheets, and design challenge
                                packets respectively). If anything is missing,
                                message the Remind (@Sophie Liang).
                            </p>
                            <p>
                                <strong>
                                    Please remember to take a photo of the room,
                                    as we will need to rearrange the desks at
                                    the end of the day.
                                </strong>{" "}
                                Once you take a photo, send it to Sophie on
                                Remind. If you do not submit a photo, your
                                service hours will not be approved.
                            </p>

                            <h3 className="text-lg font-bold text-gray-800 pt-4">
                                Opening Ceremony
                            </h3>
                            <p>
                                At 9:00 AM, make your way to the back of the
                                auditorium with your proctor partner. When the
                                students assigned to your room are called, wave
                                so they can see you. Bring your teams to your
                                assigned room.
                            </p>

                            <h3 className="text-lg font-bold text-gray-800 pt-4">
                                Prepare for Testing
                            </h3>
                            <p>
                                Fill out the morning attendance on the volunteer
                                portal.{" "}
                                <strong>
                                    Make sure to click &quot;Submit
                                    Attendance&quot;.
                                </strong>{" "}
                                If any team has fewer than 4 members, message
                                Sophie on Remind. Once your attendance is
                                complete, read the following:
                            </p>

                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    Please put your phones, smartwatches,
                                    calculators, and any other electronic
                                    devices in your bags. Place your bags at the
                                    front of the room. You should only have
                                    pencils or pens and an eraser with you.
                                    Please keep your water bottles on the floor
                                    to avoid spilling water on your papers.
                                </p>
                            </div>

                            <p>
                                Once they are back in their seats, read the
                                following:
                            </p>

                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    Cheating in any form&mdash;including
                                    collaboration with other participants or the
                                    use of calculators, the internet, or other
                                    materials&mdash;will result in immediate
                                    disqualification.
                                </p>
                                <p>
                                    The SMST organizers have worked hard to
                                    create challenging and interesting
                                    questions. No one is expected to answer
                                    every question correctly. You will likely
                                    see questions that are challenging to you.
                                    Give these questions your best effort, and
                                    keep in mind that there is no penalty for
                                    guessing or for incorrect answers.
                                </p>
                                <p>
                                    If you believe a question is unclear or
                                    there is not exactly one correct answer, you
                                    may raise a protest by informing us, your
                                    proctors, after the test.
                                </p>
                                <p>
                                    We will start with the two individual
                                    rounds, lasting 45 minutes each.
                                </p>
                            </div>

                            <p>
                                <span className="italic">
                                    Note: If a protest occurs, see the section
                                    titled <strong>Protests</strong> below.
                                </span>
                            </p>

                            <h3 className="text-lg font-bold text-gray-800 pt-4">
                                Individual Math Round
                            </h3>
                            <p>
                                When you receive a message on Remind to start
                                the <strong>Individual Math Round</strong>, read
                                the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are now handing out the math rounds,
                                    answer sheets, and scrap paper. Do not open
                                    the packet until you are instructed. If you
                                    need more scrap paper during the round,
                                    raise your hand, and we will give you more.
                                </p>
                            </div>
                            <p>
                                The rounds and answer sheets are in the manila
                                folder labeled &quot;Math&quot;. Distribute one
                                math round, one individual answer sheet, and one
                                piece of scrap paper per person. Then, read the
                                following:
                            </p>

                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You have one answer sheet for all your
                                    answers. Please indicate your answer for
                                    multiple-choice questions by fully filling
                                    in the respective letter option in pencil.
                                    If you change your answer, make sure to
                                    erase fully. Fill out your responses for
                                    short-answer questions in the appropriate
                                    box. Please make sure your answers are neat
                                    and legible. If an answer is illegible or
                                    not read correctly due to stray marks or
                                    improper marking, it will be judged
                                    incorrect. You may write in your packet, but
                                    any work or answers in the packet will not
                                    be scored.
                                </p>
                                <p>
                                    Now, please fill in all of the information
                                    on the answer sheet, including your full
                                    name, your team name, and the room number.
                                    Write &quot;Math&quot; in the spot for
                                    Round. Answer sheets without a name will not
                                    be scored.
                                </p>
                            </div>

                            <p>
                                Give the students time to fill in the
                                information. Then, emphasize the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                Your answer sheet will be read using a scanner,
                                so if you fill it out incorrectly, it will not
                                be scored properly. If you don&apos;t know how
                                to fill out the answer sheet, please ask now.
                            </div>
                            <p>
                                Answer any questions about filling in the answer
                                sheet. If you don&apos;t know the answer to a
                                question, ask us on Remind. Then, read the
                                following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You will have 45 minutes to answer the 15
                                    multiple-choice and 5 short-answer questions
                                    in your packet. Once the round begins, we
                                    will write the end time on the board. We
                                    will provide a 5-minute warning before the
                                    end of the round. If you have extra time,
                                    you may check your work or sit quietly. We
                                    will collect all your answer sheets at the
                                    end.
                                </p>
                                <p>Good luck! You may now begin.</p>
                            </div>
                            <p>
                                Start a stopwatch (on a phone or computer) and
                                write the start and end time on the board. Make
                                sure the time is clearly visible.
                            </p>
                            <p>
                                No talking or cheating is allowed during the
                                round. Provide reminders of this when necessary.{" "}
                                <strong>
                                    Only one participant may leave the room at a
                                    time to go to the restroom during the exam.
                                </strong>{" "}
                                If asked, you can clarify the meaning of
                                non-technical words. For example, you can tell
                                them that in context, &quot;primary&quot; means
                                &quot;main,&quot; but you cannot tell them what
                                terms like &quot;autotroph&quot; mean. If
                                you&apos;re not sure if you can clarify, ask on
                                Remind.
                            </p>
                            <p>
                                <strong>
                                    Remember to give a 5-minute warning.
                                </strong>{" "}
                                When time is up, read the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                Stop, time&apos;s up. Put your pencils down and
                                close your question packets. We will now come
                                around and collect all your papers for this
                                round.
                            </div>
                            <p>
                                Make sure everyone stops working immediately.
                                One proctor should collect all the answer
                                sheets, and the other proctor should collect all
                                other materials. Make sure that all the answer
                                sheets have a name on them, then put them in the
                                manila folder labeled &quot;Math&quot;. All
                                other papers should be recycled. A hall runner
                                will come collect the folder.
                            </p>
                            <p>
                                Text Remind &quot;Room ---- is done with the
                                math round&quot;.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                We will now have a 10-minute break before we
                                start the science round. Stay in the classroom
                                unless you need to use the bathroom.
                            </div>
                            <p>
                                Students can grab a snack and talk. We will come
                                to each room with a cart to hand out snacks. At
                                10:43 (two minutes before the snack break is
                                over), have the students clean up and get back
                                in their seats.
                            </p>

                            <h3 className="text-lg font-bold text-gray-800 pt-4">
                                Individual Science Round
                            </h3>
                            <p>
                                When you receive a message on Remind to start
                                the <strong>Individual Science Round</strong>,
                                read the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are now handing out the science rounds,
                                    answer sheets, and scrap paper. Do not open
                                    the packet until you are instructed. If you
                                    need more scrap paper during the round,
                                    raise your hand, and we will give you more.
                                </p>
                            </div>
                            <p>
                                The rounds and answer sheets are in the manila
                                folder labeled &quot;Science&quot;. Distribute
                                one science round, one individual answer sheet,
                                and one piece of scrap paper per person. Then,
                                read the following:
                            </p>

                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You have one answer sheet for all your
                                    answers. Please indicate your answer for
                                    multiple-choice questions by fully filling
                                    in the respective letter option in pencil.
                                    If you change your answer, make sure to
                                    erase fully. Fill out your responses for
                                    short-answer questions in the appropriate
                                    box. Please make sure your answers are neat
                                    and legible. If an answer is illegible or
                                    not read correctly due to stray marks or
                                    improper marking, it will be judged
                                    incorrect. You may write in your packet, but
                                    any work or answers in the packet will not
                                    be scored.
                                </p>
                                <p>
                                    Now, please fill in all of the information
                                    on the answer sheet, including your full
                                    name, your team name, and the room number.
                                    Write &quot;Science&quot; in the spot for
                                    Round. Answer sheets without a name will not
                                    be scored.
                                </p>
                            </div>

                            <p>
                                Give the students time to fill in the
                                information. Then, emphasize the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                Your answer sheet will be read using a scanner,
                                so if you fill it out incorrectly, it will not
                                be scored properly. If you don&apos;t know how
                                to fill out the answer sheet, please ask now.
                            </div>
                            <p>
                                Answer any questions about filling in the answer
                                sheet. If you don&apos;t know the answer to a
                                question, ask us on Remind. Then, read the
                                following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You will have 45 minutes to answer the 15
                                    multiple-choice and 5 short-answer questions
                                    in your packet. Once the round begins, we
                                    will write the end time on the board. We
                                    will provide a 5-minute warning before the
                                    end of the round. If you have extra time,
                                    you may check your work or sit quietly. We
                                    will collect all your answer sheets at the
                                    end.
                                </p>
                                <p>Good luck! You may now begin.</p>
                            </div>
                            <p>
                                Start a stopwatch (on a phone or computer) and
                                write the start and end time on the board. Make
                                sure the time is clearly visible.
                            </p>
                            <p>
                                No talking or cheating is allowed during the
                                round. Provide reminders of this when necessary.{" "}
                                <strong>
                                    Only one participant may leave the room at a
                                    time to go to the restroom during the exam.
                                </strong>{" "}
                                If asked, you can clarify the meaning of
                                non-technical words. For example, you can tell
                                them that in context, &quot;primary&quot; means
                                &quot;main,&quot; but you cannot tell them what
                                terms like &quot;autotroph&quot; mean. If
                                you&apos;re not sure if you can clarify, ask on
                                Remind.
                            </p>
                            <p>
                                <strong>
                                    Remember to give a 5-minute warning.
                                </strong>{" "}
                                When time is up, read the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                Stop, time&apos;s up. Put your pencils down and
                                close your question packets. We will now come
                                around and collect all your papers for this
                                round.
                            </div>
                            <p>
                                Make sure everyone stops working immediately.
                                One proctor should collect all the answer
                                sheets, and the other proctor should collect all
                                other materials. Make sure that all the answer
                                sheets have a name on them, then put them in the
                                manila folder labeled &quot;Science&quot;. All
                                other papers should be recycled. A hall runner
                                will come collect the folder.
                            </p>
                            <p>
                                Text Remind &quot;Room ---- is done with the
                                science round&quot;.
                            </p>
                        </>
                    )}

                    {shift === "morning" && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Lunch and Labs
                            </h3>
                            <p>
                                If you are in the 1500s, you have lunch first;
                                bring your students to the cafeteria. If you are
                                in the 1400s or 1300s, you have lab demos first;
                                bring your teams to the main hallway (near the
                                STEAM room). Once your students are where they
                                are supposed to be, you are free to leave.
                            </p>
                        </>
                    )}

                    {shift === "full-day" && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Lunch and Labs
                            </h3>
                            <p>
                                If you are in the 1500s, you have lunch first;
                                bring your students to the cafeteria. If you are
                                in the 1400s or 1300s, you have lab demos first;
                                bring your teams to the main hallway (near the
                                STEAM room). Once your students are where they
                                are supposed to be, you are free until 12:35. We
                                will have pizza available for full-day proctors
                                in the downstairs STEAM room. We only have
                                enough for 2 slices per person; please be
                                courteous.
                            </p>
                        </>
                    )}

                    {shift === "afternoon" && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Afternoon Check-In
                            </h3>
                            <p>
                                Please arrive and check in by 12:30 PM. Go to
                                the STEAM room and find{" "}
                                <strong>Unnimaya Sajeev or Sophie Liang</strong>{" "}
                                to check in. Once you are checked in, head to
                                your assigned afternoon room listed on the
                                volunteer portal.
                            </p>
                        </>
                    )}

                    {(shift === "afternoon" || shift === "full-day") && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Design Challenge
                            </h3>
                            <p>
                                By 12:35, you should be at your assigned
                                afternoon room. As the students make their way
                                back to the classroom, please fill out the
                                afternoon attendance on the volunteer portal. If
                                anyone who was present in the morning is now
                                absent, please let us know through Remind.
                            </p>
                            <p>
                                Once everyone is in the room, you may begin the
                                design challenge:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are about to begin the design challenge.
                                    Please sit with your team and separate from
                                    the other team.
                                </p>
                            </div>
                            <p>
                                Allow the students to get into their teams.
                                Position the teams as far away from each other
                                as possible, provided each group has ample
                                working space.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are now passing out the design challenge
                                    packets. You may reference the packet
                                    throughout the duration of the challenge.
                                </p>
                            </div>
                            <p>
                                The packets are in the manila folder labeled
                                &quot;Team&quot;. Pass out one design challenge
                                packet to each team.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    This year, our design challenge is building
                                    a fan-powered sailboat. You now have five
                                    minutes to read through the design challenge
                                    packet with your team. You may strategize
                                    and discuss with your team.
                                </p>
                            </div>
                            <p>
                                Set a five-minute timer. Teams may strategize
                                until the end of the five minutes.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are now passing out the materials for the
                                    design challenge. When you receive the
                                    materials, make sure all the materials
                                    listed in the packet are present. Please
                                    raise your hand if you are missing
                                    materials. Please do not begin working until
                                    instructed to do so.
                                </p>
                            </div>
                            <p>
                                Pass out one bag of materials to each team. If
                                anyone asks a question about their materials
                                that is not immediately obvious to you, please
                                contact the Remind and an SMST lead will come
                                assist you.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You will have 30 minutes to build your boat.
                                    Good luck! You may now begin.
                                </p>
                            </div>
                            <p>
                                Start a stopwatch (on a phone or computer) and
                                write the start and end time on the board. Make
                                sure the time is clearly visible. You do not
                                need to give warnings. The design challenge
                                instructions should be clear about what is or is
                                not allowed. If teams have questions about what
                                they can/cannot do, refer them to the
                                instructions first. If they still have
                                questions, please contact us on Remind.
                            </p>
                            <p>When time is up, read the following:</p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    Stop, time's up. Take your hands off of your
                                    sailboat.
                                </p>
                            </div>
                            <p>
                                Make sure that they immediately stop working and
                                give additional instructions if needed.{" "}
                                <strong>
                                    If they continue working on their boat,
                                    please message us on Remind with the team
                                    name.
                                </strong>
                            </p>
                            <p>
                                Text Remind &quot;Room ---- is ready for
                                testing&quot;, and SMST Labs &amp; Design
                                members will come and test the boats. While
                                waiting, please instruct students to throw away
                                (or recycle) materials they did not use.
                            </p>
                            <p className="italic">
                                Note: Due to timing, it is possible that the
                                students won't be able to watch us test their
                                sailboat. If this happens, please have your
                                students write the team name on their boats.
                            </p>
                            <h3 className="text-lg font-bold text-gray-800 pt-4">
                                Team Round
                            </h3>
                            <p>
                                Give your students a 5&ndash;10 minute break to
                                go to the bathroom, drink water, etc., before
                                starting the team round. Please make sure you
                                are ready to start by 1:50. Make sure that
                                everyone has returned and that their phones are
                                still at the front of the classroom.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    We are about to begin the team round. Please
                                    sit with your team and separate from the
                                    other team. During this round, you may
                                    collaborate with other members of your team.
                                </p>
                                <p>
                                    We are now handing out the team rounds,
                                    answer sheets, and scrap paper. Do not open
                                    the packet until you are instructed. If you
                                    need more scrap paper during the round,
                                    raise your hand, and we will give you more.
                                </p>
                            </div>
                            <p>
                                The rounds and answer sheets are in the manila
                                folder labeled &quot;Team&quot;. Distribute one
                                team round packet and one answer sheet to each
                                team. Then, distribute one piece of scrap paper
                                per person.
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You have one answer sheet for all your
                                    answers. Fill out your responses in the
                                    appropriate box. Please make sure your
                                    answers are neat and legible. If an answer
                                    is illegible, it will be judged incorrect.
                                    You may write in your packet, but any work
                                    or answers in the packet will not be scored.
                                </p>
                                <p>
                                    Now, please fill in your team name on the
                                    spot indicated on the answer sheet. Answer
                                    sheets without a team name will not be
                                    scored.
                                </p>
                            </div>
                            <p>
                                Check if anyone has any questions. If you don't
                                know the answer to a question, please message us
                                on Remind. Once everyone is ready:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                <p>
                                    You will have 45 minutes to answer the 10
                                    short-answer questions in your packet. Once
                                    the round begins, we will write the end time
                                    on the board. We will provide a 5-minute
                                    warning before the end of the round. If you
                                    have extra time, you may check your work or
                                    sit quietly. We will collect all your answer
                                    sheets at the end.
                                </p>
                                <p>
                                    Remember that in all calculations, the
                                    acceleration of gravity should be assumed to
                                    be 10 meters per second squared.
                                </p>
                                <p>Good luck! You may now begin.</p>
                            </div>
                            <p>
                                Start a stopwatch (on a phone or computer) and
                                write the start and end time on the board. Make
                                sure the time is clearly visible.
                            </p>
                            <p>
                                No cheating is allowed during the round, and
                                competitors may not talk to the other team.
                                Provide reminders of this when necessary.{" "}
                                <strong>
                                    Only one participant may leave the room at a
                                    time to go to the restroom during the exam.
                                </strong>{" "}
                                If asked, you can clarify the meaning of
                                non-technical words. For example, you can tell
                                them that in context, &quot;primary&quot; means
                                &quot;main,&quot; but you cannot tell them what
                                terms like &quot;autotroph&quot; mean. If
                                you&apos;re not sure if you can clarify, ask on
                                Remind.
                            </p>
                            <p>
                                <strong>
                                    During this round, you and the other proctor
                                    should fill out participation certificates
                                    for each student in your room. Use the names
                                    as listed in the attendance panel. The
                                    certificates are in the &quot;Team&quot;
                                    folder.
                                </strong>
                            </p>
                            <p>
                                <strong>
                                    Remember to give a 5-minute warning.
                                </strong>{" "}
                                When time is up, read the following:
                            </p>
                            <div className="border border-gray-300 rounded-xl shadow-md p-6 my-8 space-y-4 bg-gray-50">
                                Stop, time&apos;s up. Put your pencils down and
                                close your question packets. We will now come
                                around and collect all your papers for this
                                round.
                            </div>
                            <p>
                                Make sure everyone stops working immediately.
                                One proctor should collect all the answer
                                sheets, and the other proctor should collect all
                                other materials. Make sure that all the answer
                                sheets have a team name on them, then put them
                                in the manila folder labeled &quot;Team&quot;.
                                All other papers should be recycled. A hall
                                runner will come collect the folder.
                            </p>
                            <p>
                                Text Remind &quot;Room ---- is done with the
                                team round&quot;.
                            </p>
                            <p>
                                Pass out the participation certificates that
                                were filled out earlier. Once you receive a
                                message on Remind, have the students pack up,
                                then bring them down to the auditorium. Students
                                should sit with their teams.
                            </p>
                            <p>
                                Once your students are seated, go to the upper
                                level of the auditorium and find a seat. Once
                                the tournament is over, help dismiss the
                                students and make sure they all leave.{" "}
                                <strong>
                                    If you are an SMST club member, we will take
                                    a team photo after the event.
                                </strong>{" "}
                                Before you leave, take a picture of your cleaned
                                room with everything back in place and send it
                                to us on Remind.{" "}
                                <strong>
                                    Remember, if you do not submit a photo, your
                                    service hours will not be approved.
                                </strong>
                            </p>
                        </>
                    )}
                    {(shift === "morning" ||
                        shift === "full-day" ||
                        shift === "afternoon") && (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 pt-4 border-t border-gray-100">
                                Protests
                            </h3>
                            <p>
                                Competitors are allowed to issue a protest for
                                any round after the round has concluded. If a
                                competitor informs you that they would like to
                                issue a protest, please message the Remind with
                                the room number, question number, round, and
                                reason for the protest.{" "}
                                <strong>
                                    Please make sure that the protest is valid.
                                </strong>{" "}
                                The competitor must articulate why there is no
                                answer or more than one answer. Protests should
                                not have reasons like &quot;the question was too
                                hard&quot; or &quot;I couldn't solve it&quot;.
                            </p>
                            <p>
                                The SMST Committee will determine if the protest
                                is valid. If it is, the question will not be
                                scored.
                            </p>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
