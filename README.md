# IASTECH-Hackathon-FRONT
Frontend desenvolvido para um hackathon da IAstech, com foco na análise automatizada de imagens de desenhos técnicos de tubulações de água e conversão das informações identificadas em dados estruturados.

# Análise de Desenhos Técnicos — IASTECH

Frontend desenvolvido durante um Hackathon da **IASTECH**, com o objetivo de facilitar a análise de desenhos técnicos de sistemas de tubulações de água.

## Sobre o projeto

A aplicação permite que o usuário envie uma imagem de um desenho técnico de tubulações. A partir dessa imagem, o sistema realiza a análise dos elementos presentes no projeto, identificando informações relacionadas às tubulações e seus componentes.

A proposta é transformar informações presentes em desenhos técnicos, que normalmente precisam ser analisadas manualmente, em **dados estruturados e organizados**, facilitando o trabalho de profissionais da área.

## Funcionalidades

- Upload de imagens de desenhos técnicos;
- Interface simples e intuitiva para envio dos arquivos;
- Processamento das imagens através do sistema de análise;
- Identificação de informações presentes nos desenhos de tubulações;
- Estruturação dos dados encontrados;
- Exportação das informações para formato **XLS/Excel**.

## Objetivo

O projeto busca utilizar tecnologia para **automatizar e agilizar a interpretação de desenhos técnicos de tubulações de água**, reduzindo processos manuais e facilitando a transformação de informações visuais em dados utilizáveis.

## Arquitetura

Este repositório contém o **frontend** da solução.

O frontend é responsável pela interface com o usuário, permitindo o envio das imagens e a visualização/interação com o processo de conversão.

```text
Usuário
   │
   ▼
Frontend
   │
   │ Imagem do desenho técnico
   ▼
Backend / Processamento
   │
   │ Análise da imagem
   ▼
Dados estruturados
   │
   ▼
Arquivo XLS
