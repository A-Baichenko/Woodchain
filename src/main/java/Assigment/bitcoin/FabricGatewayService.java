package Assigment.bitcoin;

import io.grpc.Grpc;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import jakarta.annotation.PreDestroy;
import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.Network;
import org.hyperledger.fabric.client.identity.Identities;
import org.hyperledger.fabric.client.identity.Signers;
import org.hyperledger.fabric.client.identity.X509Identity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

@Service
public class FabricGatewayService {

    private static final String MSP_ID = "Org1MSP";

    private final ManagedChannel channel;
    private final Gateway gateway;
    private final Contract contract;

    public FabricGatewayService(
            @Value("${fabric.channel-name}") String channelName,
            @Value("${fabric.chaincode-name}") String chaincodeName,
            @Value("${fabric.crypto-path}") String cryptoPath,
            @Value("${fabric.peer-endpoint}") String peerEndpoint,
            @Value("${fabric.peer-override-auth}") String peerHostAlias
    ) throws Exception {
        Path cryptoBasePath = Path.of(cryptoPath);

        Path certDir = cryptoBasePath.resolve(
                "users/User1@org1.example.com/msp/signcerts"
        );

        Path keyDir = cryptoBasePath.resolve(
                "users/User1@org1.example.com/msp/keystore"
        );

        Path tlsCertPath = cryptoBasePath.resolve(
                "peers/peer0.org1.example.com/tls/ca.crt"
        );

        this.channel = createGrpcChannel(
                tlsCertPath,
                peerEndpoint,
                peerHostAlias
        );

        X509Certificate certificate = readCertificate(certDir);
        PrivateKey privateKey = readPrivateKey(keyDir);

        this.gateway = Gateway.newInstance()
                .identity(new X509Identity(MSP_ID, certificate))
                .signer(Signers.newPrivateKeySigner(privateKey))
                .connection(channel)
                .connect();

        Network network = gateway.getNetwork(channelName);
        this.contract = network.getContract(chaincodeName);
    }

    /*
     * Baut die sichere Verbindung zum Hyperledger Fabric Peer auf.
     */
    private ManagedChannel createGrpcChannel(
            Path tlsCertPath,
            String peerEndpoint,
            String peerHostAlias
    ) throws Exception {
        return Grpc.newChannelBuilder(
                peerEndpoint,
                TlsChannelCredentials.newBuilder()
                        .trustManager(tlsCertPath.toFile())
                        .build()
        ).overrideAuthority(peerHostAlias).build();
    }

    /*
     * Liest das öffentliche Benutzerzertifikat.
     */
    private X509Certificate readCertificate(Path certDir) throws Exception {
        try (Reader certReader = Files.newBufferedReader(
                FilesUtil.getFirstFile(certDir)
        )) {
            return Identities.readX509Certificate(certReader);
        }
    }

    /*
     * Liest den privaten Schlüssel.
     */
    private PrivateKey readPrivateKey(Path keyDir) throws Exception {
        try (Reader keyReader = Files.newBufferedReader(
                FilesUtil.getFirstFile(keyDir)
        )) {
            return Identities.readPrivateKey(keyReader);
        }
    }

    /*
     * Liest Daten aus der Blockchain.
     */
    private String evaluate(
            String functionName,
            String... args
    ) throws Exception {
        byte[] result = contract.evaluateTransaction(functionName, args);
        return toText(result);
    }

    /*
     * Speichert eine Transaktion in der Blockchain.
     */
    private String submit(
            String functionName,
            String... args
    ) throws Exception {
        byte[] result = contract.submitTransaction(functionName, args);
        return toText(result);
    }

    private String toText(byte[] result) {
        return new String(result, StandardCharsets.UTF_8);
    }

    public String getAllWood() throws Exception {
        return evaluate("GetAllWood");
    }

    public String readWood(String id) throws Exception {
        return evaluate("ReadWood", id);
    }

    /*
     * Alter Ablauf ohne feste Lieferkettenplanung.
     */
    @Deprecated
    public String createWood(
            String id,
            String treeType,
            String volumeM3,
            String origin,
            String owner,
            String location
    ) throws Exception {
        return submit(
                "CreateWood",
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location
        );
    }

    /*
     * Förster erstellt eine Holzcharge mit Lieferkettenplanung.
     */
    public String createWoodWithPlan(
            String id,
            String treeType,
            String volumeM3,
            String origin,
            String owner,
            String location,
            String logisticsToSawmill,
            String sawmill
    ) throws Exception {
        return submit(
                "CreateWoodWithPlan",
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location,
                logisticsToSawmill,
                sawmill
        );
    }

    /*
     * Alter allgemeiner Transport.
     */
    @Deprecated
    public String transportWood(
            String id,
            String newOwner,
            String newLocation
    ) throws Exception {
        return submit(
                "TransportWood",
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Transport vom Wald zum Sägewerk.
     */
    public String transportToSawmill(
            String id,
            String logisticsOwner,
            String logisticsLocation
    ) throws Exception {
        return submit(
                "TransportToSawmill",
                id,
                logisticsOwner,
                logisticsLocation
        );
    }

    /*
     * Alter Verarbeitungsschritt ohne Versandplanung.
     */
    @Deprecated
    public String processWood(
            String id,
            String newOwner,
            String newLocation
    ) throws Exception {
        return submit(
                "ProcessWood",
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Verarbeitung im Sägewerk mit Planung des Händlertransports.
     */
    public String processWoodWithRetailPlan(
            String id,
            String sawmillOwner,
            String sawmillLocation,
            String logisticsToRetail,
            String retail
    ) throws Exception {
        return submit(
                "ProcessWoodWithRetailPlan",
                id,
                sawmillOwner,
                sawmillLocation,
                logisticsToRetail,
                retail
        );
    }

    /*
     * Transport vom Sägewerk zum Händler.
     */
    public String transportToRetail(
            String id,
            String logisticsOwner,
            String logisticsLocation
    ) throws Exception {
        return submit(
                "TransportToRetail",
                id,
                logisticsOwner,
                logisticsLocation
        );
    }

    /*
     * Händler bestätigt den Wareneingang.
     */
    public String sellWood(
            String id,
            String newOwner,
            String newLocation
    ) throws Exception {
        return submit(
                "SellWood",
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Gibt die vollständige Historie einer Holzcharge zurück.
     */
    public String getWoodHistory(String id) throws Exception {
        return evaluate("GetWoodHistory", id);
    }

    /*
     * Schließt die Fabric-Verbindung beim Beenden.
     */
    @PreDestroy
    public void closeConnection() {
        gateway.close();
        channel.shutdownNow();
    }
}