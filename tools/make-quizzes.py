# -*- coding: utf-8 -*-
# A PRIMEIRA alternativa e sempre a correta; o jogo embaralha ao montar a prova.
import io, json, collections

bank = []


def q(era, n, prompt, options, explain):
    bank.append(collections.OrderedDict([
        ('id', '%s-q%d' % (era, n)), ('era', era), ('prompt', prompt),
        ('options', options), ('explain', explain),
    ]))


# ---- Era 1: Mecanica -------------------------------------------------------
q('mecanica', 1, 'O que a Pascalina, de 1642, era capaz de fazer?', [
    'Somar e subtrair girando engrenagens, sem guardar programa nem resultado',
    'Rodar programas gravados em fita magnética',
    'Multiplicar usando válvulas eletrônicas',
    'Guardar dados em disco para usar depois',
], 'A Pascalina é uma calculadora mecânica: faz a conta na hora e esquece. Memória e programa armazenado só aparecem três séculos depois.')

q('mecanica', 2, 'Para que serviam os cartões perfurados no tear de Jacquard (1804)?', [
    'Guardavam o padrão a ser tecido, fora da máquina',
    'Guardavam o resultado dos cálculos do tear',
    'Serviam para contar quantos metros foram tecidos',
    'Eram o combustível que movia o tear',
], 'Trocando os cartões, o mesmo tear faz outro desenho. É a primeira vez que a instrução vira um objeto separado da máquina.')

q('mecanica', 3, 'O que Ada Lovelace percebeu nas notas de 1843 que Babbage não escreveu?', [
    'Que a máquina poderia tratar símbolos, como notas musicais, e não só números',
    'Que a máquina seria mais rápida com eletricidade',
    'Que o cálculo poderia ser feito por válvulas',
    'Que a máquina conseguiria aprender com exemplos',
], 'Lovelace viu que, se os números representassem outras coisas, a Máquina Analítica deixaria de ser calculadora e viraria máquina de manipular símbolos.')

q('mecanica', 4, 'Por que a Máquina Analítica nunca foi construída por inteiro no século XIX?', [
    'Custava caro demais e exigia precisão mecânica que a época não alcançava',
    'Porque Babbage não conseguiu descrever o projeto',
    'Porque a eletricidade ainda não tinha sido descoberta',
    'Porque ninguém sabia que programa escrever para ela',
], 'O projeto estava no papel e era coerente; faltaram dinheiro e usinagem precisa o bastante para as milhares de peças.')

q('mecanica', 5, 'O que o poder Repetir resolve, nesta era?', [
    'Descrever um padrão longo com poucas instruções, em vez de escrever cada passo',
    'Fazer a máquina calcular mais rápido',
    'Guardar o resultado do cálculo na memória',
    'Permitir que duas máquinas conversem',
], 'Repetir é compressão de instrução: em vez de um cartão por linha igual, um grupo e a ordem de repetir.')

# ---- Era 2: Valvulas e Logica ---------------------------------------------
q('logica', 1, 'O que Claude Shannon mostrou em 1937?', [
    'Que circuitos de relés obedecem à álgebra de Boole, então lógica vira fiação',
    'Que a informação pode ser comprimida sem perda',
    'Que toda máquina pode imitar qualquer outra',
    'Que o transistor substituiria a válvula',
], 'Ligado e desligado viram verdadeiro e falso: E, Ou e Não passam a ser construídos com chaves. É a base de todo hardware digital.')

q('logica', 2, 'O que a máquina universal de Turing (1936) estabeleceu?', [
    'Que uma única máquina pode imitar qualquer outra, bastando trocar o programa',
    'Que nenhum problema matemático pode ser resolvido por máquina',
    'Que o cálculo precisa de válvulas para ser rápido',
    'Que a memória precisa ser separada dos dados',
], 'É a ideia do computador de uso geral: não se constrói uma máquina por tarefa, troca-se a descrição que ela segue.')

q('logica', 3, 'Como o ENIAC (1945) era programado?', [
    'Mudando cabos e chaves na própria máquina, o que levava dias',
    'Digitando comandos em um teclado ligado a uma tela',
    'Carregando um programa guardado na memória junto com os dados',
    'Perfurando cartões que a máquina lia automaticamente',
], 'No ENIAC o programa era a fiação. Trocar de problema era remontar a máquina; foi isso que empurrou a ideia de programa armazenado.')

q('logica', 4, 'Qual era o maior problema prático das válvulas?', [
    'Eram muitas, esquentavam muito e queimavam com frequência',
    'Não conseguiam representar verdadeiro e falso',
    'Eram pequenas demais para serem fabricadas',
    'Só funcionavam ligadas a uma rede de computadores',
], 'O ENIAC tinha cerca de 18 mil válvulas. Manutenção e calor eram o limite real do tamanho da máquina.')

q('logica', 5, 'O que significa guardar o programa na mesma memória dos dados?', [
    'Trocar de tarefa vira carregar números, em vez de remontar a máquina',
    'O programa passa a rodar sem precisar de processador',
    'Os dados ficam protegidos contra erros de cálculo',
    'A máquina passa a escrever os próprios programas',
], 'É a arquitetura de programa armazenado: a mesma memória guarda instrução e dado, e carregar um programa vira uma operação comum.')

# ---- Era 3: Transistor e Linguagens ---------------------------------------
q('codigo', 1, 'Que vantagem o transistor (1947) trouxe sobre a válvula?', [
    'Sólido, pequeno, gasta pouca energia e não queima a toda hora',
    'Conseguia representar três estados em vez de dois',
    'Dispensava o uso de memória na máquina',
    'Permitia que a máquina se conectasse à internet',
], 'Mesma função lógica, custo e tamanho muito menores. É o que tira o computador da sala inteira e o coloca num armário.')

q('codigo', 2, 'Para que serve um compilador?', [
    'Traduzir um programa escrito por pessoas para o código que o processador executa',
    'Conectar dois computadores pela rede',
    'Guardar os dados do programa em disco',
    'Corrigir sozinho os erros de lógica do programa',
], 'Grace Hopper defendeu que a tradução é trabalho de máquina. O compilador é o que torna viável programar em linguagem de alto nível.')

q('codigo', 3, 'Qual foi a grande objeção ao Fortran (1957), e o que aconteceu?', [
    'Diziam que o código gerado seria lento demais; o ganho de tempo de quem escreve compensou',
    'Diziam que ninguém entenderia a sintaxe; ela foi abandonada',
    'Diziam que não funcionaria com transistores; precisou de válvulas',
    'Diziam que exigiria rede; ficou restrito a um laboratório',
], 'A crítica era de desempenho. Na prática, programar em dias em vez de meses passou a valer mais que o ciclo economizado.')

q('codigo', 4, 'Por que o COBOL usava comandos parecidos com inglês?', [
    'Para que quem entende do negócio conseguisse ler o programa',
    'Porque o processador só entendia palavras em inglês',
    'Para que o programa ocupasse menos memória',
    'Porque era obrigatório nos computadores da época',
], 'A aposta era de legibilidade: aproximar o texto do programa da linguagem de quem define a regra.')

q('codigo', 5, 'Como você falava com o computador desta era?', [
    'Por cartões perfurados ou fita, numa sala com ar condicionado',
    'Por teclado e mouse, em casa',
    'Por comandos de voz',
    'Pela rede, de qualquer lugar do mundo',
], 'A máquina é cara e compartilhada: você entrega o trabalho e espera a vez. O uso pessoal e interativo só chega depois.')

# ---- Era 4: Redes ----------------------------------------------------------
q('redes', 1, 'O que é comutação por pacotes?', [
    'A mensagem se parte em pedaços que seguem caminhos diferentes e são remontados no destino',
    'Um fio exclusivo é reservado entre as duas máquinas durante a conversa',
    'Todas as mensagens passam por um computador central que as distribui',
    'A mensagem é enviada inteira e, se falhar, se perde',
], 'Sem caminho reservado, a rede aproveita melhor os enlaces e sobrevive à queda de trechos: os pacotes desviam.')

q('redes', 2, 'O que aconteceu na primeira mensagem da ARPANET, em 1969?', [
    'Tentaram enviar login e o sistema caiu depois das duas primeiras letras',
    'A mensagem chegou completa e sem erro na primeira tentativa',
    'A conexão durou três dias seguidos sem falha',
    'A mensagem foi enviada por satélite entre dois países',
], 'O sistema caiu depois do lo. O episódio virou símbolo de como a rede começou: funcionando mal, mas funcionando.')

q('redes', 3, 'Qual a diferença entre IP e TCP?', [
    'O IP entrega o pacote sem garantia; o TCP confere o que faltou e pede de novo',
    'O IP cifra os dados; o TCP os comprime',
    'O IP é usado em redes locais; o TCP só na internet',
    'O IP guarda os dados; o TCP os apaga depois do uso',
], 'Separar entrega de confiabilidade foi o que deixou a rede crescer: cada camada resolve um problema e só um.')

q('redes', 4, 'Quais as três peças que Tim Berners-Lee propôs para a Web?', [
    'Um endereço (URL), um jeito de pedir (HTTP) e um jeito de escrever (HTML)',
    'Um cabo, um roteador e um servidor',
    'Um navegador, um e-mail e um buscador',
    'Um protocolo, uma senha e um certificado',
], 'A Web não substituiu a internet: ela é uma aplicação em cima dela, feita de endereço, pedido e formato.')

q('redes', 5, 'Por que uma rede de pacotes resiste melhor a falhas?', [
    'Se um trecho cai, os pacotes seguem por outro caminho até o destino',
    'Porque cada máquina guarda uma cópia de toda a rede',
    'Porque a mensagem é enviada várias vezes de propósito',
    'Porque um computador central refaz a conexão',
], 'Não há caminho único nem centro obrigatório: a decisão de rota acontece salto a salto.')

# ---- Era 5: Web, Nuvem e Seguranca ----------------------------------------
q('seguranca', 1, 'Que problema a criptografia de chave pública (1976) resolveu?', [
    'Dois desconhecidos combinarem uma chave secreta conversando em canal aberto',
    'Deixar a mensagem menor para caber na rede',
    'Impedir que a mensagem se perca no caminho',
    'Fazer o computador decifrar mais rápido',
], 'Antes era preciso já ter combinado a chave em segredo. Numa rede entre estranhos, isso era inviável.')

q('seguranca', 2, 'Para que serve a chave privada?', [
    'Fica só com o dono e nunca é distribuída; é o que prova que é ele',
    'É enviada junto com a mensagem para o destinatário conferir',
    'É publicada para qualquer um poder cifrar',
    'É trocada a cada mensagem enviada',
], 'O par é assimétrico: a pública circula e cifra, a privada fica guardada e decifra ou assina.')

q('seguranca', 3, 'Por que cifrar bem exige acaso?', [
    'Se a mesma mensagem sempre virar o mesmo texto cifrado, quem observa aprende demais',
    'Porque o computador precisa de números aleatórios para ligar',
    'Porque o acaso deixa a cifragem mais rápida',
    'Porque sem acaso a chave fica grande demais',
], 'Repetição vaza informação mesmo sem quebrar a cifra. Por isso a mesma mensagem precisa cifrar diferente a cada vez.')

q('seguranca', 4, 'O que caracteriza a computação em nuvem?', [
    'Você aluga por hora a fatia de uma máquina que está num datacenter de outra pessoa',
    'Cada usuário tem o próprio servidor em casa',
    'Os dados ficam guardados apenas no navegador',
    'Os programas rodam sem precisar de nenhum computador',
], 'Capacidade sob demanda: sobe quando o acesso cresce, desce quando cai, e a conta é pelo uso.')

q('seguranca', 5, 'Em segurança, o que deve ser secreto?', [
    'A chave; o método de cifragem é público e revisado por todos',
    'O método de cifragem, que nunca deve ser divulgado',
    'O endereço do servidor que guarda os dados',
    'O tamanho da mensagem enviada',
], 'Método secreto não é testado por ninguém. Algoritmo aberto e chave guardada é o que resiste ao tempo.')

# ---- Era 6: Inteligencia Artificial ---------------------------------------
q('ia', 1, 'Como uma rede neural aprende?', [
    'Vê exemplos, erra, e o erro volta ajustando os pesos das ligações',
    'Recebe de um especialista a regra pronta e a executa',
    'Procura a resposta num banco de dados de respostas certas',
    'Testa todas as respostas possíveis até achar a certa',
], 'É a retropropagação: o erro na saída é distribuído para trás, corrigindo cada peso um pouco.')

q('ia', 2, 'Por que o ImageNet foi importante?', [
    'Deu milhões de exemplos rotulados, sem os quais o modelo não aprende',
    'Foi o primeiro algoritmo de rede neural',
    'Substituiu a necessidade de placas de vídeo',
    'Provou que o computador pensa como uma pessoa',
], 'A virada de 2012 não foi só de algoritmo: foi de dado em quantidade e de cálculo em paralelo.')

q('ia', 3, 'O que a rede convolucional explora numa imagem?', [
    'Que o mesmo padrão local, como uma borda, importa em qualquer parte da figura',
    'Que toda imagem tem o mesmo tamanho',
    'Que as cores são mais importantes que as formas',
    'Que a imagem precisa estar em preto e branco',
], 'Procurar o mesmo filtro pela figura inteira reduz muito o número de pesos e aproveita a estrutura da imagem.')

q('ia', 4, 'Qual é o preço do modelo que aprende por exemplos?', [
    'Ele acerta sem conseguir explicar por quê, e erra sem saber que errou',
    'Ele fica lento conforme recebe mais dados',
    'Ele só funciona com dados em texto',
    'Ele precisa ser reescrito a cada nova tarefa',
], 'O modelo aprendeu um padrão estatístico, não uma justificativa. Explicar a decisão é um problema em aberto.')

q('ia', 5, 'O que mudou em 2012 com a AlexNet?', [
    'Uma rede profunda treinada em placas de vídeo venceu o desafio por margem enorme',
    'Foi inventada a primeira rede neural da história',
    'Os computadores passaram a dispensar dados de treino',
    'As redes neurais deixaram de ser usadas',
], 'A combinação de rede profunda, muitos dados e GPU mostrou que a escala resolvia o que o algoritmo sozinho não resolvia.')

io.open('src/data/quizzes.pt-BR.json', 'w', encoding='utf-8').write(
    json.dumps(bank, indent=2, ensure_ascii=False) + '\n')

print('perguntas:', len(bank))
for era in ['mecanica', 'logica', 'codigo', 'redes', 'seguranca', 'ia']:
    n = sum(1 for x in bank if x['era'] == era)
    print(' ', era, n)
assert all(len(x['options']) == 4 for x in bank), 'toda pergunta precisa de 4 alternativas'
ids = [x['id'] for x in bank]
assert len(ids) == len(set(ids)), 'id repetido'
print('ok')
