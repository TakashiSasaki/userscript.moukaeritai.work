# Summary

In ChatGPT Plus, especially when using GPT-4, the inference process can take a considerable amount of time. With this user script, a button can be automatically pressed to send the next pre-filled prompt once ChatGPT has finished generating the response text.

In previous versions of this user script, it was necessary to schedule button presses from the menu. Starting from version 1.0.0.20231004, you can now press the button itself to send the prompt.

## Usage

### 1. Yellow button

   When this user script detects a button for sending messages, it changes the background color of the button to yellow.
   ![Yellow button](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBNnpWQVE9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--833d8047ffc1e7a744fbf1a8597c73a7835a2e27/Screenshot%202023-10-04%20200331.jpg?locale=ja)

### 2. Red text area

Clicking the yellow button schedules the sending of messages through this user script. The background of the text area turns red to indicate a reserved state. This operation acts as a toggle.
   ![Red text area](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBNnJWQVE9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--1f75634872b1ee214a2bd1785ecc0af14d03bc8c/Screenshot%202023-10-04%20200439.jpg?locale=ja)

### 3. That's all

  Once the current output is finished, i.e., the button display changes from dots "..." to a triangle "▶", the button will be automatically pressed.

## Script Locations

This UserScript is available at two locations:

1. **GitHub Gist**: You can find the script hosted on GitHub Gist at [this link](https://gist.github.com/TakashiSasaki/730f930806ec1a6460ab350f7498d622/).
2. **Greasy Fork**: The script is also available on Greasy Fork, and you can access it [here](https://greasyfork.org/ja/scripts/472713).