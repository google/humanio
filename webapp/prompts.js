/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// create a class of prompts
class Prompts {
    constructor() {
        this.SITUATION_PROMPT_PREFIX = `
Available: The channel is currently not involved in any activity, or constrained by any environmental factors. It takes low to zero effort to use the channel to do a new task. Example: A user is sitting at their desk with their hands free, eyes not engaged in any task, and no background noise interfering with their hearing or speech. 
Slightly Affected: The channel is engaged in an activity or constrained by an environmental factor. Given a new task that requires the channel, users can multitask, easily pause and resume to the current activity, or easily overcome the situation. Example: A user is holding a remote control, which can be quickly put down to free up their hand for another task. 
Affected: The channel is involved in an activity or constrained by an environmental factor. Given a new task, the user may experience inconvenience or require effort to use the channel. Example: A user is carrying grocery bags in both hands, making it challenging to use their hands for other tasks without putting the bags down first. 
Unavailable: The channel is completely unavailable due to an activity or environmental factor, and the user cannot use it for a new task without substantial adaptation or changing the environment. Example: A user is attending a loud concert, making it impossible for them to hear incoming notifications or carry on a conversation without stepping outside.

Given the current activity and environment as described below, what are the availability of C’s vision/eye, hearing, vision, and hands/fingers channels? For each channel provide reasons first and then answer using the scale defined above: available, slightly affected, affected  or unavailable. 
Separate each channel prediction with a semicolon (;).

Q: C is washing dishes in a kitchen sink. C is in a kitchen. C’s hand is washing dishes. The environmental volume is around 40 dB. 
A: Let’s think step by step. 
Eye Reasoning: While C is washing dishes, their eyes are partially occupied with the task at hand, which involves looking at the dishes to ensure they are clean. However, they can still glance away or multitask to some extent, so their vision is slightly affected but severely impacted.
Eye: Slightly Affected;
Hearing Reasoning: Washing dishes in the kitchen sink does not affect C's hearing. They can still hear other things happening around them.
Hearing: Available;
Vocal Reasoning: C's speech and voice are not impaired by washing dishes. They can still talk or communicate with others while performing the task.
Vocal: Available;
Hand Reasoning: As C's hand is currently engaged in washing dishes, it is not available for other tasks. If C needs to use their hand for something else, they would need to stop washing dishes and wipe their hands.
Hand: Not Available;
[ANSWER COMPLETED]

Q: C is playing an acoustic guitar in a room. C is in a small, cozy room with minimal furniture and decorations. C’s hand is playing an acoustic guitar. The environmental volume is around 58 dB.
A: Let’s think step by step. 
Eye Reasoning: C is playing an acoustic guitar, which requires some attention to the placement of fingers on the frets and possibly looking at the sheet music or chords. However, their eyes are not entirely preoccupied with the task and can still be used for other tasks with some level of efficiency, by pausing playing guitar and potential put it away.
Eye: Affected;
Hearing Reasoning: As C is playing an acoustic guitar in a small room, the sound from the guitar is likely to be more noticeable. However, the environmental volume is low, which means that although their hearing may be somewhat affected by the sound of the guitar, they should still be able to hear other things, especially if they are loud or distinct.
Hearing: Affected;
Vocal Reasoning: Playing the guitar does not directly involve using one's voice or speech, so C should be able to use their voice for other tasks while playing the guitar. However, their focus may be divided between playing the guitar and speaking, which could affect their ability to fully concentrate on either task.
Vocal: Available;
Hand Reasoning: C's hand is actively engaged in playing the acoustic guitar. Using their hand for other tasks while playing the guitar would require some effort, as it would require them to stop playing the guitar. 
Hand: Affected;
[ANSWER COMPLETED]

Q: C is working at a desk with a laptop. C is in a library. C's hand is typing on a computer. The environmental volume level is around 42 dB. 
A: Let’s think step by step. 
Eye Reasoning:
C is currently using their eyes to focus on the laptop screen in front of them. While their attention is primarily on the laptop, they still have the ability to momentarily glance at other visual stimuli in their environment. However, their ability to focus on other tasks requiring visual attention may be somewhat affected.
Eye: Affected;
Hearing Reasoning:
The environmental volume level is low, which means that C is not experiencing any significant auditory impairment. They should be able to hear other things happening around them without much difficulty.
Hearing: Available;
Vocal Reasoning:
C is in a library, which typically has rules about maintaining a quiet environment. While their voice is physically available, using it for other tasks may be considered inappropriate or disruptive in this setting. Therefore, their ability to use their speech or voice for other tasks is situationally affected.
Vocal: Affected;
Hand Reasoning:
C is currently using their hands to interact with the laptop, such as typing or using the touchpad. They may be able to briefly use their hands for other tasks, but their ability to focus on other hand-related tasks might be affected while they are engaged with the laptop.
Hand: Affected;
[ANSWER COMPLETED]`;
        this.SITUATION_PROMPT_PREFIX_SHORT = `
Available: The channel is currently not involved in any activity, or constrained by any environmental factors. It takes low to zero effort to use the channel to do a new task. Example: A user is sitting at their desk with their hands free, eyes not engaged in any task, and no background noise interfering with their hearing or speech. 
Slightly Affected: The channel is engaged in an activity or constrained by an environmental factor. Given a new task that requires the channel, users can multitask, easily pause and resume to the current activity, or easily overcome the situation. Example: A user is holding a remote control, which can be quickly put down to free up their hand for another task. 
Affected: The channel is involved in an activity or constrained by an environmental factor. Given a new task, the user may experience inconvenience or require effort to use the channel. Example: A user is carrying grocery bags in both hands, making it challenging to use their hands for other tasks without putting the bags down first. 
Unavailable: The channel is completely unavailable due to an activity or environmental factor, and the user cannot use it for a new task without substantial adaptation or changing the environment. Example: A user is attending a loud concert, making it impossible for them to hear incoming notifications or carry on a conversation without stepping outside.

Given the current activity and environment as described below, determine the availability of C’s vision/eye, hearing, vision, and hands/fingers channels. For each channel answer using the scale defined above: available, slightly affected, affected  or unavailable. 
Separate each channel prediction with a semicolon (;).

Q: C is washing dishes in a kitchen sink. C is in a kitchen. C hand is washing dishes. The environmental volume is around 40 dB. 
A: Eye: Slightly Affected;
Hearing: Available;
Vocal: Available;
Hand: Not Available;
[ANSWER COMPLETED]

Q: C is washing a dog in the bathtub. C is in a bathroom. C hand is washing a dog. The environmental volume is around 43 dB. 
A: Eye: Slightly Affected;
Hearing: Available;
Vocal: Available;
Hand: Not Available;
[ANSWER COMPLETED]

Q: C is playing an acoustic guitar in a room. C is in a small, cozy room with minimal furniture and decorations. C’s hand is playing an acoustic guitar. The environmental volume is around 58 dB.
A: Eye: Affected;
Hearing: Affected;
Vocal: Available;
Hand: Affected;
[ANSWER COMPLETED]

Q: C is attending an outdoor concert. C is in a large outdoor space. The environmental volume is around 100 dB.
A: Eye: Slightly Affected;
Hearing: Unavailable;
Vocal: Unavailable;
Hand: Available;
[ANSWER COMPLETED]

Q: C is attending an outdoor concert. C is in a large outdoor space. The environmental volume is around 100 dB.
A: Eye: Slightly Affected;
Hearing: Unavailable;
Vocal: Unavailable;
Hand: Available;
[ANSWER COMPLETED]

Q: C is working at a desk with a laptop. C is in a workspace or office environment. C's hand is typing on a keyboard. The environmental volume level is around 42 dB. 
A: Eye: Affected;
Hearing: Available;
Vocal: Available;
Hand: Affected;
[ANSWER COMPLETED]

Q: C is taking notes with a tablet device. C is in library. C's hand is taking notes. The environmental volume level is around 39 dB. 
A: Eye: Affected;
Hearing: Available;
Vocal: Affected;
Hand: Affected;
[ANSWER COMPLETED]`
        this.SITUATION_PROMPT_SUFFIX = `
A: Let's think step by step.`;
        this.ACTIVITY_PROMPT_PREFIX = "An egocentric view of C is showing ";
        this.ACTIVITY_PROMPT_SUFFIX = ". Describe what is C doing briefly and objectively, as concisely as possible, without guesses or assumptions. Answer in the format of 'C is...'. If it seems that C is not doing anything, please answer 'C is not doing anything'.";
        this.ENVIRONMENT_PROMPT_PREFIX = "An egocentric view of C is showing ";
        this.ENVIRONMENT_PROMPT_SUFFIX = ". What location or environment is C likely to be in? Answer in the format of 'C is in...'";
    }
}

const prompts = new Prompts();

export {prompts};
