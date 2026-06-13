OpenJetty --- Claude Build Day Brief Anthropic Hackathon · Saturday ·
Paste this into Claude Code to begin 

THE PROBLEM 45 million immigrants
in America cannot afford an immigration lawyer for every question. When
their status changes, when a policy shifts at USCIS, when they need to
know if they qualify for a benefit --- they are on their own. They
search Google, read Reddit, and hope they are not making a mistake that
costs them their visa or their green card. 

Immigration lawyers charge
\$300--500 per hour. Most immigrants cannot afford to call for a simple
question. 

The information exists --- USCIS publishes everything publicly
--- but it is buried in government jargon, constantly changing, and
impossible to navigate without expertise. 

WHAT YOU ARE BUILDING
OpenJetty Immigration Navigator --- a web app where an immigrant
describes their situation in plain English, and the AI reasons through
it, fetches current real data from USCIS, and gives them a specific,
accurate answer about their situation and their next step. 

This is not a chatbot that answers from training data. It is an agent that goes out,gets live information, reasons across it, and gives a personalized
answer. That is the core innovation. 

THE FULL USER FLOW (build exactly
this) 

Step 1 --- User describes their situation + optionally uploads
documents Two inputs on the same screen: 

1. A text area where the user
types in plain English: "I am on an H-1B visa. My employer just filed
for my green card. My priority date is March 2019 EB-2 India. I want to
know where I stand and what I should be doing right now." 

2. An optional
file upload area: "Upload your documents for deeper analysis (I-94,
approval notices, I-140, passport pages)"

Accept PDF and image files Label it clearly as optional --- plain
English alone is enough to get a useful answer If documents are
uploaded, Claude Model reads them and cross-references them against what the
user described The power move: The AI compares what the user said
against what the documents actually show --- and surfaces discrepancies
the user did not know about (e.g. a travel gap during cap-gap, a job
change that affects I-140 portability, an OPT end date that creates
unlawful presence risk) 

Step 2 --- Claude Model fetches live data The agent
uses web search tools to fetch: Current USCIS Visa Bulletin (updated
monthly --- what priority dates are current right now) Current
processing times for the relevant form types (I-485, I-140, etc.) Any
recent USCIS policy updates relevant to the user's case type 

Step 3 ---
Claude Model reasons across everything The agent combines what the user told
it with the live data it fetched and reasons step by step: What is the
user's current status? 
What is their priority date vs the current cutoff
date? Are they eligible to file I-485 right now or still waiting? What
is the estimated wait time based on current processing? What should they
do in the next 30 days? Show the reasoning out loud as it streams ---
this is the most impressive part of the demo. 

Step 4 --- Clear, specific
answer Not a wall of text. A structured result: Your situation: \[one
paragraph summary\] Where you stand: \[specific status --- e.g. "Your
priority date is current. You can file I-485 now."\] Your next step:
\[one specific action --- e.g. "File I-485 within the next 60 days
before the bulletin retrogresses"\] What to watch: \[one thing to
monitor --- e.g. "Check the November visa bulletin on October 8th"\]


Step 5 --- Match to a specialist (optional, show if time allows) Show 3
immigration attorneys in San Francisco who specialize in the user's case
type (EB-2 India, H-1B to green card). These

can be real attorneys pulled from web search or hardcoded mock data ---
either is fine for the demo. 

Step 6 --- Attorney AI concierge (the "both
sides" moment) Click on one attorney. Their AI concierge opens ---
pre-loaded with 3 documents (a mock intake FAQ, a mock fee schedule, a
mock what-to-expect guide). 

The user can ask: "Do you do free
consultations? What documents should I bring?" The AI answers from those
documents only. RUBRIC --- Grade yourself against this before stopping
After building each section, check it against this list. 

Do not stop
until every item passes. The app: Loads at a live public URL without
errors Works on mobile (basic responsive layout) No broken links, no
console errors The analysis flow: User can type their situation in plain
English and submit Document upload works --- PDFs and images accepted,
processed correctly If documents are uploaded, the AI cross-references
them against the user's description and flags any discrepancies The
agent fetches at least one piece of live data from USCIS or a public
source (not just training data) 

The reasoning streams visibly (Maybe fastapi streaming - you decide the best possible ways to build this product) --- the
user can see the agent thinking step by step The final result is
structured: situation summary, where they stand, next step, what to
watch The result is specific to what the user typed --- not a generic
answer The attorney match: At least 3 attorneys shown with name,
specialty, and why they match Clicking an attorney opens the concierge
chat The concierge: Answers questions from the pre-loaded documents only

Does not make up information not in the documents Responses stream in
real time Self-verification: After building each feature, run a test
with sample input and confirm the output matches what is expected If a
test fails, fix it before moving to the next feature After the full flow
is built, run the complete journey end to end with the demo scenario
below and confirm every rubric item passes THE DEMO SCENARIO (use this
exact input for testing and for the live demo) I came to the US on an
F-1 student visa in 2015. I graduated in 2018 and got OPT. My employer
sponsored my H-1B in 2019 and I have been on H-1B since October 2019. My
employer filed my I-140 in January 2022 under EB-2 My country of birth
is India. My priority date is January 15, 2022. I want to know where I
stand on my green card and what I should be doing. This is a real,
common scenario. The answer involves checking the current EB-2 India
cutoff date in the visa bulletin, comparing it to the priority date, and
giving a realistic timeline. This is the scenario you demo live on
Saturday. Document upload demo scenario (use this if showing the
document feature): Upload a mock I-140 approval notice (you can create a
simple PDF with these details): Petitioner: Tech Corp Inc Beneficiary:
\[Demo User\] Classification: EB-2 Priority Date: January 15, 2022
Approval Date: March 10, 2023 Then type: "I changed jobs in August 2023.
My new employer is Startup Inc. Is my green card still valid?"

The AI should catch that the I-140 was filed by the old employer,
calculate that the job change happened 5 months after approval (under
180 days = AC21 portability not yet available), and flag this as a
critical risk requiring immediate legal consultation. TECH STACK Keep it
simple. Do not over-engineer. Backend: Python + FastAPI Frontend: Simple
HTML + vanilla JavaScript (no React needed --- keep it fast to build)
AI: Anthropic SDK, model claude-fable-5 (use whatever model ID Anthropic
gives you Saturday morning) Web search: Use the web search tool
available in Claude Code to fetch live USCIS data Deploy: Railway
(connect GitHub repo, auto-deploys on push) No database needed ---
in-memory is fine for the demo SELF-CORRECTION INSTRUCTION You have full
autonomy to build, test, and fix this without asking for permission at
each step. When something does not work: 1. Read the error 2. Diagnose
the cause 3. Fix it 4. Test again 5. Move on only when it passes Do not
ask me whether to proceed. Do not wait for approval between steps.
Build, verify against the rubric, fix what fails, and stop only when
every rubric item passes. If you are genuinely stuck on something after
two attempts, describe the problem in one sentence and ask a specific
question. Do not ask open-ended questions like "how should I proceed?"

WHAT NOT TO BUILD 
Cut these completely --- they add time and zero demo

value: User login or accounts A real attorney database or Google Places
integration Payment processing Email or SMS notifications A mobile app
Any database (in-memory is fine) Multiple languages (English only) Admin
dashboard THE PITCH (memorize this --- 60 seconds) "45 million
immigrants in America cannot afford to call their lawyer every time a
policy changes or they have a question about their status. OpenJetty
gives them an AI that actually goes and looks up their situation right
now --- live data from USCIS, current visa bulletin, current processing
times --- and tells them exactly where they stand and what to do next.
This is not a chatbot answering from old training data. This is an agent
that reasons across live information and gives you a specific answer
about your specific case. We built this in one day using Claude Model. The
same architecture works for any professional services vertical ---
legal, financial, medical navigation. But we started here because this
is where the information asymmetry is most painful and the stakes are
highest." SESSION LOG NOTE Save the full Claude Code session log. The
judges will review it to score Autonomy and Orchestration. The log
should show: Long stretches of the model working without human
intervention The model catching and fixing its own errors The model
running the rubric check itself and deciding when it is done

OpenJetty Claude Model Brief v2.1 --- Immigration Navigator --- June 2026
Added: Document upload feature with cross-referencing against user
description
