// запустить в консоли браузера

async function fetchAnswers() {
    const totalQuestions = 15;
    const answersPerQuestion = 10; // Перебираем от 0 до 9 с запасом
    const allData = {};

    console.log("Начинаем сбор ответов... Пожалуйста, не закрывайте вкладку.");

    for (let q = 1; q <= totalQuestions; q++) {
        allData[q] = [];
        for (let a = 0; a < answersPerQuestion; a++) {
            try {
                const formData = new URLSearchParams();
                formData.append('question', q);
                formData.append('answer', a);

                const response = await fetch('https://crimegames.ru/keymorgan/include/check_answer.php', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (!response.ok) continue;

                const text = await response.text();
                if (!text) continue;

                const data = JSON.parse(text);

                if (typeof data.correct !== 'undefined') {
                    allData[q].push({
                        answerIndex: a,
                        correct: data.correct,
                        message: data.message,
                        isComplete: data.isComplete || false
                    });
                }

                // Пауза 300мс, чтобы не перегружать сервер
                await new Promise(r => setTimeout(r, 300));

            } catch (e) {
                // Игнорируем ошибки парсинга для несуществующих ответов
            }
        }
        console.log(`Собран вопрос ${q}/${totalQuestions}`);
    }

    // Сохраняем в файл
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "answers.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log("Сбор завершен! Файл answers.json сохранен.");
}

fetchAnswers();
