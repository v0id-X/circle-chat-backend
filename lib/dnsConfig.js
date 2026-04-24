import dns from 'dns'
export const dnsConfig = () => dns.setServers(["1.1.1.1","8.8.8.8"]) 
