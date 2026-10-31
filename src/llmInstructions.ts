// The "LLM Formatting Instructions" document users can save from the main menu and
// paste into ChatGPT, Claude, Gemini, etc. along with their source questions.

export const SAMPLE_QUESTION = `## Question
ID: cardio-001
Tags: Cardiology, Pharmacology, Arrhythmias
Source: Block 3 Practice Exam

### Stem
A 67-year-old man comes to the emergency department because of palpitations for 2 hours. His pulse is 148/min and irregularly irregular, and blood pressure is 128/76 mm Hg. An ECG is shown.

![ECG showing an irregularly irregular narrow-complex rhythm](images/cardio-001-ecg.png)

Which of the following is the most appropriate next step to control his heart rate?

### Choices
A. Adenosine
B. Amiodarone
C. Diltiazem
D. Electrical cardioversion
E. Procainamide

### Answer
C

### Explanation
This patient is hemodynamically stable with **atrial fibrillation with rapid ventricular response**. First-line rate control uses a nondihydropyridine calcium channel blocker (eg, **diltiazem**) or a beta blocker.

| Option | Why it is wrong here |
|---|---|
| Adenosine | Transiently blocks the AV node; does not treat atrial fibrillation |
| Amiodarone | Rhythm control agent with significant toxicity; not first-line for rate control |
| Cardioversion | Reserved for hemodynamic instability |
| Procainamide | Used for preexcited atrial fibrillation (eg, WPW) |

Ventricular rate depends on AV nodal conduction, which slows as the refractory period lengthens: $\\text{rate} \\propto 1/\\text{AV refractory period}$.

### Educational Objective
Hemodynamically stable atrial fibrillation with rapid ventricular response is treated first with rate control using a beta blocker or nondihydropyridine calcium channel blocker.
`;

export function buildLlmInstructions(): string {
  return `# YouWorld Question Formatting Instructions (for an AI assistant)

You are converting multiple-choice practice questions into the **YouWorld** question bank format. YouWorld is a study app that imports a Markdown (.md) file and turns it into a randomized, taggable question bank. Follow these rules exactly so the file imports without errors.

---

## Your task

1. Read the source material the user provides (pasted text, a PDF, slides, a practice exam, or lecture notes).
2. Convert **every** single-best-answer multiple-choice question into the format below. If asked to *write* new questions from notes, write high-quality clinical vignette questions in the same format.
3. Output **one Markdown code block** containing the complete file, so the user can save it as \`questions.md\`. If the output would be very long, split it across several files (for example 25 to 50 questions per file) and say so.

---

## File structure

The file may optionally begin with **front matter** that sets defaults for every question in the file. A question's own \`Tags:\` or \`Source:\` line overrides these defaults.

\`\`\`
---
Source: Block 3 Practice Exam
Tags: Cardiology
---
\`\`\`

Then, **each question** follows this exact skeleton:

\`\`\`
## Question
ID: <unique-id>
Tags: <tag 1>, <tag 2>, <tag 3>
Source: <where the question came from>

### Stem
<question text, may include images, tables, and math>

### Choices
A. <choice text>
B. <choice text>
C. <choice text>

### Answer
<single letter>

### Explanation
<full explanation>

### Educational Objective
<one or two sentence take-home point (optional)>
\`\`\`

### Rules for each part

**\`## Question\`** (required): Every question starts with a level-2 heading that begins with the word "Question" (\`## Question\`, \`## Question 12\` are both fine). Do not use \`##\` headings for anything else.

**Metadata lines** (between \`## Question\` and \`### Stem\`), each on its own line:
- \`ID:\` (strongly recommended). A short, unique, stable identifier using letters, numbers, dashes, or periods, such as \`renal-014\` or \`exam3-q27\`. YouWorld uses the ID to recognize a question if the same file is imported again, so the user's progress is preserved. **Never reuse an ID for a different question, and keep an ID unchanged if you later fix a typo in that question.** If omitted, YouWorld identifies the question by its text instead.
- \`Tags:\` A comma-separated list of free-form subject tags (organ system, discipline, topic). Use consistent spelling and capitalization across the whole file (for example always "Cardiology", never "cardio" in one place and "Cardiology" in another). 2 to 4 tags per question is ideal.
- \`Source:\` Where the question came from (for example "Block 3 Practice Exam", "Dr. Lee Lecture 5", "AI-generated from Renal notes"). Use the identical string for every question from the same source.

**\`### Stem\`** (required): The question text. Keep the original wording when converting existing questions. End with the actual question (for example "Which of the following is the most likely diagnosis?").

**\`### Choices\`** (required): One choice per line, each starting with a capital letter followed by a period and a space: \`A. \`, \`B. \`, \`C. \` and so on. Any number of choices from 2 to 26 is allowed. Single best answer only: exactly one choice is correct. Do not put the correct answer in bold or otherwise hint at it.

**\`### Answer\`** (required): Only the letter of the correct choice, such as \`C\`.

**\`### Explanation\`** (strongly recommended): Explain why the correct answer is right and why each other choice is wrong. If the source has no explanation, write an accurate one and keep it consistent with the answer key. If you are not confident, say so in the explanation rather than inventing facts.

**\`### Educational Objective\`** (optional): One or two sentences summarizing the key teaching point.

---

## Formatting inside questions and explanations

- **Bold** with \`**text**\`, *italics* with \`*text*\`.
- Bulleted lists with \`- \` and numbered lists with \`1. \`.
- Tables with standard Markdown pipe tables (header row, then \`|---|---|\`). Lab results in a stem read well as a table.
- Math and formulas with LaTeX: inline \`$...$\` and display \`$$...$$\`. Write currency as "USD 5" or "5 dollars" rather than with a dollar sign, to avoid confusion with math.
- Do **not** use \`##\` or \`###\` headings inside the stem, choices, or explanation.

---

## Figures and images

Insert images with standard Markdown image syntax on their own line:

\`\`\`
![Short description of the image](images/cardio-001-ecg.png)
\`\`\`

- Use a **relative path** (such as \`images/filename.png\`) and give each image a unique, descriptive file name, ideally starting with the question ID.
- Images may appear in the stem, inside a choice, or in the explanation.
- Supported types: PNG, JPG/JPEG, GIF, WEBP, SVG.
- A full web address (\`https://...\`) also works, but the image will only display while the computer is online.
- If you cannot extract an image from the source, still insert the image line with the intended file name and add a note at the end of your reply listing each image file the user needs to save and which question it belongs to. Always write the alt text so the question still makes sense if the image is missing.

**How the user imports images:** put the .md file and the images (or an \`images\` folder) together, then either select them all in YouWorld's Import screen, drag the folder in, or compress the folder into a .zip and import the .zip.

---

## Final checklist before you answer

- Every question starts with \`## Question\` and has \`### Stem\`, \`### Choices\`, and \`### Answer\`.
- Choice letters are sequential, start at A, and each appears once.
- The \`### Answer\` letter matches one of the choices, and the explanation agrees with it.
- Every question has a unique \`ID:\`.
- Tags and sources are spelled consistently throughout the file.
- No answer is revealed in the stem or choices.

---

## Complete example

\`\`\`\`markdown
---
Source: Block 3 Practice Exam
---

${SAMPLE_QUESTION}
## Question
ID: renal-002
Tags: Nephrology, Physiology

### Stem
Which segment of the nephron reabsorbs the largest fraction of filtered sodium?

### Choices
A. Proximal convoluted tubule
B. Thick ascending limb of the loop of Henle
C. Distal convoluted tubule
D. Collecting duct

### Answer
A

### Explanation
The **proximal convoluted tubule** reabsorbs about two thirds of filtered sodium. The thick ascending limb reabsorbs about 25%, the distal convoluted tubule about 5%, and the collecting duct a small, hormonally regulated remainder.
\`\`\`\`
`;
}
