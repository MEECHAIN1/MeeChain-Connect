# MeeChain Architecture

System architecture และ component overview

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │NFT Market│  │ Staking  │  │  Wallet  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │ MetaMask  │                            │
│                    └─────┬─────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Express   │
                    │   Server    │
                    │ (port 3000) │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
   │ OpenAI  │      │   Web3.js   │   │    Nginx    │
   │   API   │      │  (Ethers)   │   │ SSL Proxy   │
   └─────────┘      └──────┬──────┘   │ (port 5005) │
                           │           └──────┬──────┘
                    ┌──────▼──────┐          │
                    │  Hardhat    │◄─────────┘
                    │    Node     │
                    │ (port 8545) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Blockchain │
                    │ (Chain ID:  │
                    │    13390)   │
                    └─────────────┘
```


## 📦 Component Details

### Frontend Layer
- **HTML/CSS/JS**: Static files served by Express
- **MetaMask Integration**: Web3 wallet connection
- **SSE Client**: Real-time chat streaming

### Backend Layer (Express Server)
- **API Routes**: RESTful endpoints
- **Web3 Service**: Smart contract interaction
- **AI Integration**: OpenAI GPT-5-mini
- **Session Management**: In-memory chat history

### Blockchain Layer
- **Hardhat Node**: Local Ethereum development node
- **Smart Contracts**: Token, NFT, Staking
- **RPC Provider**: JSON-RPC interface

### Infrastructure Layer
- **Nginx**: SSL termination and reverse proxy
- **Environment Config**: dotenv for secrets

## 🔄 Data Flow

### User Transaction Flow
```
User → MetaMask → Web3.js → RPC → Blockchain → Contract
                                                    ↓
User ← MetaMask ← Web3.js ← RPC ← Blockchain ← Event
```

### AI Chat Flow
```
User → Frontend → POST /api/chat/stream → OpenAI API
                                              ↓
User ← Frontend ← SSE Stream ← Express ← Response
```

## 🔐 Security Considerations

- Environment variables for secrets
- CORS configuration
- SSL/TLS encryption
- MetaMask signature verification
- Rate limiting (recommended for production)

