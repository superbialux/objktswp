export const getIpfsUrl = (uri) => {
    const path = uri.replace('ipfs://', '')
    return 'https://ipfs.io/ipfs/' + path
}