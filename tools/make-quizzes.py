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
    'Rodar programas gravados em fita magnetica',
    'Multiplicar usando valvulas eletronicas',
    'Guardar dados em disco para usar depois',
], 'A Pascalina e uma calculadora mecanica: faz a conta na hora e esquece. Memoria e programa armazenado so aparecem tres seculos depois.')

q('mecanica', 2, 'Para que serviam os cartoes perfurados no tear de Jacquard (1804)?', [
    'Guardavam o padrao a ser tecido, fora da maquina',
    'Guardavam o resultado dos calculos do tear',
    'Serviam para contar quantos metros foram tecidos',
    'Eram o combustivel que movia o tear',
], 'Trocando os cartoes, o mesmo tear faz outro desenho. E a primeira vez que a instrucao vira um objeto separado da maquina.')

q('mecanica', 3, 'O que Ada Lovelace percebeu nas notas de 1843 que Babbage nao escreveu?', [
    'Que a maquina poderia tratar simbolos, como notas musicais, e nao so numeros',
    'Que a maquina seria mais rapida com eletricidade',
    'Que o calculo poderia ser feito por valvulas',
    'Que a maquina conseguiria aprender com exemplos',
], 'Lovelace viu que, se os numeros representassem outras coisas, a Maquina Analitica deixaria de ser calculadora e viraria maquina de manipular simbolos.')

q('mecanica', 4, 'Por que a Maquina Analitica nunca foi construida por inteiro no seculo XIX?', [
    'Custava caro demais e exigia precisao mecanica que a epoca nao alcancava',
    'Porque Babbage nao conseguiu descrever o projeto',
    'Porque a eletricidade ainda nao tinha sido descoberta',
    'Porque ninguem sabia que programa escrever para ela',
], 'O projeto estava no papel e era coerente; faltaram dinheiro e usinagem precisa o bastante para as milhares de pecas.')

q('mecanica', 5, 'O que o poder Repetir resolve, nesta era?', [
    'Descrever um padrao longo com poucas instrucoes, em vez de escrever cada passo',
    'Fazer a maquina calcular mais rapido',
    'Guardar o resultado do calculo na memoria',
    'Permitir que duas maquinas conversem',
], 'Repetir e compressao de instrucao: em vez de um cartao por linha igual, um grupo e a ordem de repetir.')

# ---- Era 2: Valvulas e Logica ---------------------------------------------
q('logica', 1, 'O que Claude Shannon mostrou em 1937?', [
    'Que circuitos de reles obedecem a algebra de Boole, entao logica vira fiacao',
    'Que a informacao pode ser comprimida sem perda',
    'Que toda maquina pode imitar qualquer outra',
    'Que o transistor substituiria a valvula',
], 'Ligado e desligado viram verdadeiro e falso: E, Ou e Nao passam a ser construidos com chaves. E a base de todo hardware digital.')

q('logica', 2, 'O que a maquina universal de Turing (1936) estabeleceu?', [
    'Que uma unica maquina pode imitar qualquer outra, bastando trocar o programa',
    'Que nenhum problema matematico pode ser resolvido por maquina',
    'Que o calculo precisa de valvulas para ser rapido',
    'Que a memoria precisa ser separada dos dados',
], 'E a ideia do computador de uso geral: nao se constroi uma maquina por tarefa, troca-se a descricao que ela segue.')

q('logica', 3, 'Como o ENIAC (1945) era programado?', [
    'Mudando cabos e chaves na propria maquina, o que levava dias',
    'Digitando comandos em um teclado ligado a uma tela',
    'Carregando um programa guardado na memoria junto com os dados',
    'Perfurando cartoes que a maquina lia automaticamente',
], 'No ENIAC o programa era a fiacao. Trocar de problema era remontar a maquina; foi isso que empurrou a ideia de programa armazenado.')

q('logica', 4, 'Qual era o maior problema pratico das valvulas?', [
    'Eram muitas, esquentavam muito e queimavam com frequencia',
    'Nao conseguiam representar verdadeiro e falso',
    'Eram pequenas demais para serem fabricadas',
    'So funcionavam ligadas a uma rede de computadores',
], 'O ENIAC tinha cerca de 18 mil valvulas. Manutencao e calor eram o limite real do tamanho da maquina.')

q('logica', 5, 'O que significa guardar o programa na mesma memoria dos dados?', [
    'Trocar de tarefa vira carregar numeros, em vez de remontar a maquina',
    'O programa passa a rodar sem precisar de processador',
    'Os dados ficam protegidos contra erros de calculo',
    'A maquina passa a escrever os proprios programas',
], 'E a arquitetura de programa armazenado: a mesma memoria guarda instrucao e dado, e carregar um programa vira uma operacao comum.')

# ---- Era 3: Transistor e Linguagens ---------------------------------------
q('codigo', 1, 'Que vantagem o transistor (1947) trouxe sobre a valvula?', [
    'Solido, pequeno, gasta pouca energia e nao queima a toda hora',
    'Conseguia representar tres estados em vez de dois',
    'Dispensava o uso de memoria na maquina',
    'Permitia que a maquina se conectasse a internet',
], 'Mesma funcao logica, custo e tamanho muito menores. E o que tira o computador da sala inteira e o coloca num armario.')

q('codigo', 2, 'Para que serve um compilador?', [
    'Traduzir um programa escrito por pessoas para o codigo que o processador executa',
    'Conectar dois computadores pela rede',
    'Guardar os dados do programa em disco',
    'Corrigir sozinho os erros de logica do programa',
], 'Grace Hopper defendeu que a traducao e trabalho de maquina. O compilador e o que torna viavel programar em linguagem de alto nivel.')

q('codigo', 3, 'Qual foi a grande objecao ao Fortran (1957), e o que aconteceu?', [
    'Diziam que o codigo gerado seria lento demais; o ganho de tempo de quem escreve compensou',
    'Diziam que ninguem entenderia a sintaxe; ela foi abandonada',
    'Diziam que nao funcionaria com transistores; precisou de valvulas',
    'Diziam que exigiria rede; ficou restrito a um laboratorio',
], 'A critica era de desempenho. Na pratica, programar em dias em vez de meses passou a valer mais que o ciclo economizado.')

q('codigo', 4, 'Por que o COBOL usava comandos parecidos com ingles?', [
    'Para que quem entende do negocio conseguisse ler o programa',
    'Porque o processador so entendia palavras em ingles',
    'Para que o programa ocupasse menos memoria',
    'Porque era obrigatorio nos computadores da epoca',
], 'A aposta era de legibilidade: aproximar o texto do programa da linguagem de quem define a regra.')

q('codigo', 5, 'Como voce falava com o computador desta era?', [
    'Por cartoes perfurados ou fita, numa sala com ar condicionado',
    'Por teclado e mouse, em casa',
    'Por comandos de voz',
    'Pela rede, de qualquer lugar do mundo',
], 'A maquina e cara e compartilhada: voce entrega o trabalho e espera a vez. O uso pessoal e interativo so chega depois.')

# ---- Era 4: Redes ----------------------------------------------------------
q('redes', 1, 'O que e comutacao por pacotes?', [
    'A mensagem se parte em pedacos que seguem caminhos diferentes e sao remontados no destino',
    'Um fio exclusivo e reservado entre as duas maquinas durante a conversa',
    'Todas as mensagens passam por um computador central que as distribui',
    'A mensagem e enviada inteira e, se falhar, se perde',
], 'Sem caminho reservado, a rede aproveita melhor os enlaces e sobrevive a queda de trechos: os pacotes desviam.')

q('redes', 2, 'O que aconteceu na primeira mensagem da ARPANET, em 1969?', [
    'Tentaram enviar login e o sistema caiu depois das duas primeiras letras',
    'A mensagem chegou completa e sem erro na primeira tentativa',
    'A conexao durou tres dias seguidos sem falha',
    'A mensagem foi enviada por satelite entre dois paises',
], 'O sistema caiu depois do lo. O episodio virou simbolo de como a rede comecou: funcionando mal, mas funcionando.')

q('redes', 3, 'Qual a diferenca entre IP e TCP?', [
    'O IP entrega o pacote sem garantia; o TCP confere o que faltou e pede de novo',
    'O IP cifra os dados; o TCP os comprime',
    'O IP e usado em redes locais; o TCP so na internet',
    'O IP guarda os dados; o TCP os apaga depois do uso',
], 'Separar entrega de confiabilidade foi o que deixou a rede crescer: cada camada resolve um problema e so um.')

q('redes', 4, 'Quais as tres pecas que Tim Berners-Lee propos para a Web?', [
    'Um endereco (URL), um jeito de pedir (HTTP) e um jeito de escrever (HTML)',
    'Um cabo, um roteador e um servidor',
    'Um navegador, um e-mail e um buscador',
    'Um protocolo, uma senha e um certificado',
], 'A Web nao substituiu a internet: ela e uma aplicacao em cima dela, feita de endereco, pedido e formato.')

q('redes', 5, 'Por que uma rede de pacotes resiste melhor a falhas?', [
    'Se um trecho cai, os pacotes seguem por outro caminho ate o destino',
    'Porque cada maquina guarda uma copia de toda a rede',
    'Porque a mensagem e enviada varias vezes de proposito',
    'Porque um computador central refaz a conexao',
], 'Nao ha caminho unico nem centro obrigatorio: a decisao de rota acontece salto a salto.')

# ---- Era 5: Web, Nuvem e Seguranca ----------------------------------------
q('seguranca', 1, 'Que problema a criptografia de chave publica (1976) resolveu?', [
    'Dois desconhecidos combinarem uma chave secreta conversando em canal aberto',
    'Deixar a mensagem menor para caber na rede',
    'Impedir que a mensagem se perca no caminho',
    'Fazer o computador decifrar mais rapido',
], 'Antes era preciso ja ter combinado a chave em segredo. Numa rede entre estranhos, isso era inviavel.')

q('seguranca', 2, 'Para que serve a chave privada?', [
    'Fica so com o dono e nunca e distribuida; e o que prova que e ele',
    'E enviada junto com a mensagem para o destinatario conferir',
    'E publicada para qualquer um poder cifrar',
    'E trocada a cada mensagem enviada',
], 'O par e assimetrico: a publica circula e cifra, a privada fica guardada e decifra ou assina.')

q('seguranca', 3, 'Por que cifrar bem exige acaso?', [
    'Se a mesma mensagem sempre virar o mesmo texto cifrado, quem observa aprende demais',
    'Porque o computador precisa de numeros aleatorios para ligar',
    'Porque o acaso deixa a cifragem mais rapida',
    'Porque sem acaso a chave fica grande demais',
], 'Repeticao vaza informacao mesmo sem quebrar a cifra. Por isso a mesma mensagem precisa cifrar diferente a cada vez.')

q('seguranca', 4, 'O que caracteriza a computacao em nuvem?', [
    'Voce aluga por hora a fatia de uma maquina que esta num datacenter de outra pessoa',
    'Cada usuario tem o proprio servidor em casa',
    'Os dados ficam guardados apenas no navegador',
    'Os programas rodam sem precisar de nenhum computador',
], 'Capacidade sob demanda: sobe quando o acesso cresce, desce quando cai, e a conta e pelo uso.')

q('seguranca', 5, 'Em seguranca, o que deve ser secreto?', [
    'A chave; o metodo de cifragem e publico e revisado por todos',
    'O metodo de cifragem, que nunca deve ser divulgado',
    'O endereco do servidor que guarda os dados',
    'O tamanho da mensagem enviada',
], 'Metodo secreto nao e testado por ninguem. Algoritmo aberto e chave guardada e o que resiste ao tempo.')

# ---- Era 6: Inteligencia Artificial ---------------------------------------
q('ia', 1, 'Como uma rede neural aprende?', [
    'Ve exemplos, erra, e o erro volta ajustando os pesos das ligacoes',
    'Recebe de um especialista a regra pronta e a executa',
    'Procura a resposta num banco de dados de respostas certas',
    'Testa todas as respostas possiveis ate achar a certa',
], 'E a retropropagacao: o erro na saida e distribuido para tras, corrigindo cada peso um pouco.')

q('ia', 2, 'Por que o ImageNet foi importante?', [
    'Deu milhoes de exemplos rotulados, sem os quais o modelo nao aprende',
    'Foi o primeiro algoritmo de rede neural',
    'Substituiu a necessidade de placas de video',
    'Provou que o computador pensa como uma pessoa',
], 'A virada de 2012 nao foi so de algoritmo: foi de dado em quantidade e de calculo em paralelo.')

q('ia', 3, 'O que a rede convolucional explora numa imagem?', [
    'Que o mesmo padrao local, como uma borda, importa em qualquer parte da figura',
    'Que toda imagem tem o mesmo tamanho',
    'Que as cores sao mais importantes que as formas',
    'Que a imagem precisa estar em preto e branco',
], 'Procurar o mesmo filtro pela figura inteira reduz muito o numero de pesos e aproveita a estrutura da imagem.')

q('ia', 4, 'Qual e o preco do modelo que aprende por exemplos?', [
    'Ele acerta sem conseguir explicar por que, e erra sem saber que errou',
    'Ele fica lento conforme recebe mais dados',
    'Ele so funciona com dados em texto',
    'Ele precisa ser reescrito a cada nova tarefa',
], 'O modelo aprendeu um padrao estatistico, nao uma justificativa. Explicar a decisao e um problema em aberto.')

q('ia', 5, 'O que mudou em 2012 com a AlexNet?', [
    'Uma rede profunda treinada em placas de video venceu o desafio por margem enorme',
    'Foi inventada a primeira rede neural da historia',
    'Os computadores passaram a dispensar dados de treino',
    'As redes neurais deixaram de ser usadas',
], 'A combinacao de rede profunda, muitos dados e GPU mostrou que a escala resolvia o que o algoritmo sozinho nao resolvia.')

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
