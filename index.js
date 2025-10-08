import { Buffer } from 'buffer'; // Necessário para Node.js

/**
 * Função para esperar um tempo em milissegundos.
 * @param {number} ms - Tempo de espera em milissegundos.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retorna a data atual no formato YYYY-MM-DD para uso na API.
 * @returns {string} Data formatada (ex: '2025-10-07').
 */
function getCurrentDate() {
    const now = new Date();
    // Obtém ano
    const year = now.getFullYear();
    // Obtém mês (0-11) e adiciona 1, depois preenche com zero
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Obtém dia e preenche com zero
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function main() {
    // 1. Configuração e Validação
    // Tenta obter o JWT de variável de ambiente ou argumento de linha de comando
    const DUOLINGO_JWT = process.env.DUOLINGO_JWT ?? process.argv[2];
    // Garante que LESSONS seja um número e define o padrão para 1
    const lessonsToRun = parseInt(process.env.LESSONS ?? 1, 10);
    // Data Dinâmica para a URL da API
    const apiDate = getCurrentDate(); 

    if (!DUOLINGO_JWT) {
        throw new Error(
            "❌ Por favor, forneça seu Duolingo JWT via a variável de ambiente DUOLINGO_JWT ou como argumento de linha de comando.",
        );
    }
    
    console.log(`\n⏳ Iniciando simulação para ${lessonsToRun} lição(ões) usando a data da API: ${apiDate}...`);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DUOLINGO_JWT}`,
        "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    };

    // 2. Obter User ID (sub) e Idiomas
    const { sub } = JSON.parse(
        Buffer.from(DUOLINGO_JWT.split(".")[1], "base64").toString(),
    );
    console.log(`🔍 User ID (sub) extraído do JWT: ${sub}`);
    
    console.log("🌍 Buscando idiomas do usuário...");
    const langResponse = await fetch(
        `https://www.duolingo.com/${apiDate}/users/${sub}?fields=fromLanguage,learningLanguage`, // URL com data dinâmica
        { headers },
    );

    const langText = await langResponse.text();
    if (!langResponse.ok) {
        console.error(`Request failed with status ${langResponse.status}. Response:`, langText);
        throw new Error(`Falha ao obter idiomas. Status: ${langResponse.status}`);
    }

    let langData;
    try {
        langData = JSON.parse(langText);
    } catch (e) {
        console.error("Failed to parse JSON for language data:", langText);
        throw new Error("Falha ao analisar JSON de idiomas.");
    }
    
    const { fromLanguage, learningLanguage } = langData;

    if (!fromLanguage || !learningLanguage) {
        throw new Error(
            "❌ Não foi possível recuperar dados de idioma. Verifique seu JWT."
        );
    }
    
    console.log(`✅ Idiomas definidos: De ${fromLanguage} para ${learningLanguage}`);

    let totalXp = 0;
    
    // 3. Loop das Lições
    for (let i = 0; i < lessonsToRun; i++) {
        console.log(`\n--- Lição ${i + 1} de ${lessonsToRun} ---`);
        
        // --- A. Criar Sessão (POST) ---
        const createSessionBody = {
            challengeTypes: [
                "assist", "characterIntro", "characterMatch", "characterPuzzle", "characterSelect",
                "characterTrace", "characterWrite", "completeReverseTranslation", "definition",
                "dialogue", "extendedMatch", "extendedListenMatch", "form", "freeResponse",
                "gapFill", "judge", "listen", "listenComplete", "listenMatch", "match", "name",
                "listenComprehension", "listenIsolation", "listenSpeak", "listenTap", "orderTapComplete",
                "partialListen", "partialReverseTranslate", "patternTapComplete", "radioBinary",
                "radioImageSelect", "radioListenMatch", "radioListenRecognize", "radioSelect",
                "readComprehension", "reverseAssist", "sameDifferent", "select", "selectPronunciation",
                "selectTranscription", "svgPuzzle", "syllableTap", "syllableListenTap", "speak",
                "tapCloze", "tapClozeTable", "tapComplete", "tapCompleteTable", "tapDescribe",
                "translate", "transliterate", "transliterationAssist", "typeCloze", "typeClozeTable",
                "typeComplete", "typeCompleteTable", "writeComprehension",
            ],
            fromLanguage,
            isFinalLevel: false,
            isV2: true,
            juicy: true,
            learningLanguage,
            smartTipsVersion: 1, 
            type: "GLOBAL_PRACTICE", 
        };

        console.log("📝 Enviando requisição para criar sessão...");
        const sessionResponse = await fetch(
            `https://www.duolingo.com/${apiDate}/sessions`, // URL com data dinâmica
            {
                body: JSON.stringify(createSessionBody),
                headers,
                method: "POST",
            },
        );

        const sessionText = await sessionResponse.text();
        if (!sessionResponse.ok) {
            console.error(`Request failed with status ${sessionResponse.status}. Response:`, sessionText);
            throw new Error(`Falha ao criar sessão. Status: ${sessionResponse.status}`);
        }

        let session;
        try {
            session = JSON.parse(sessionText);
        } catch (e) {
            console.error("Failed to parse JSON for session creation:", sessionText);
            throw new Error("Falha ao analisar JSON de criação de sessão.");
        }
        
        console.log(`✨ Sessão criada com sucesso! ID: ${session.id}`);
        
        await sleep(10); 

        // --- B. Completar Sessão (PUT) ---
        const completeSessionBody = {
            ...session,
            heartsLeft: 3, 
            startTime: (Date.now() - 60000) / 1000, 
            enableBonusPoints: true,
            endTime: Date.now() / 1000,
            failed: false, 
            maxInLessonStreak: 10, 
            shouldLearnThings: true,
        };
        
        console.log(`🚀 Enviando requisição para finalizar sessão ${session.id} como sucesso...`);

        const finalResponse = await fetch(
            `https://www.duolingo.com/${apiDate}/sessions/${session.id}`, // URL com data dinâmica
            {
                body: JSON.stringify(completeSessionBody),
                headers,
                method: "PUT",
            },
        );

        const finalText = await finalResponse.text();
        if (!finalResponse.ok) {
            console.error(`Request failed with status ${finalResponse.status}. Response:`, finalText);
            throw new Error(`Falha ao finalizar sessão. Status: ${finalResponse.status}`);
        }
        
        let response;
        try {
            response = JSON.parse(finalText);
        } catch (e) {
            console.error("Failed to parse JSON for session finalization:", finalText);
            throw new Error("Falha ao analisar JSON de finalização de sessão.");
        }
        
        const xpGained = response.xpGain || 0;
        totalXp += xpGained;
        
        console.log(`✅ Lição ${i + 1} concluída. XP Ganho nesta lição: ${xpGained}`);
        
        await sleep(10); 
    }

    console.log(`\n================================`);
    console.log(`🎉 Sucesso! Você ganhou um total de ${totalXp} XP`);
    console.log(`================================`);
}

// Execução principal com tratamento de erro
main().catch(error => {
	console.error("\n❌ Algo deu errado durante o processo.");
	if (error.message) {
		console.error(`Detalhes do Erro: ${error.message}`);
	} else {
		console.error(error);
	}
	
	// Se o erro for relacionado ao JWT inválido, pode ser útil logar isso
	if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
		console.error("Dica: Verifique se o DUOLINGO_JWT ainda é válido ou se ele expirou.");
	}
});
