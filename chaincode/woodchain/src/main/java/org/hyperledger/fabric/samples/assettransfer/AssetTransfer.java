package org.hyperledger.fabric.samples.assettransfer;

import com.owlike.genson.Genson;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ledger.KeyModification;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Contract(
        name = "WoodContract",
        info = @Info(
                title = "WoodChain Contract",
                description = "Blockchain zur Rückverfolgung von Holzchargen",
                version = "1.0.0"
        )
)
@Default
public final class AssetTransfer implements ContractInterface {

    private static final Genson GENSON = new Genson();

    private static final String HARVESTED = "HARVESTED";
    private static final String TO_SAWMILL = "IN_TRANSPORT_TO_SAWMILL";
    private static final String PROCESSED = "PROCESSED";
    private static final String TO_RETAIL = "IN_TRANSPORT_TO_RETAIL";
    private static final String SOLD = "SOLD";

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public boolean WoodExists(Context ctx, String id) {
        return ctx.getStub().getStringState(id) != null
                && !ctx.getStub().getStringState(id).isBlank();
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String CreateWood(
            Context ctx,
            String id,
            String treeType,
            String volumeM3,
            String origin,
            String owner,
            String location
    ) {
        validateRequired(id, "ID");
        ensureDoesNotExist(ctx, id);

        Asset wood = new Asset(
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location,
                HARVESTED,
                "",
                "",
                "",
                "",
                ""
        );

        return save(ctx, wood);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String CreateWoodWithPlan(
            Context ctx,
            String id,
            String treeType,
            String volumeM3,
            String origin,
            String owner,
            String location,
            String logisticsToSawmill,
            String sawmill
    ) {
        validateRequired(id, "ID");
        validateRequired(logisticsToSawmill, "Logistik zum Sägewerk");
        validateRequired(sawmill, "Sägewerk");
        ensureDoesNotExist(ctx, id);

        Asset wood = new Asset(
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location,
                HARVESTED,
                logisticsToSawmill,
                sawmill,
                "",
                "",
                sawmill
        );

        return save(ctx, wood);
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String ReadWood(Context ctx, String id) {
        return GENSON.serialize(load(ctx, id));
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String GetAllWood(Context ctx) {
        List<Asset> assets = new ArrayList<>();

        try (QueryResultsIterator<KeyValue> results =
                     ctx.getStub().getStateByRange("", "")) {
            for (KeyValue result : results) {
                if (result.getStringValue() != null
                        && !result.getStringValue().isBlank()) {
                    assets.add(
                            GENSON.deserialize(
                                    result.getStringValue(),
                                    Asset.class
                            )
                    );
                }
            }
        }

        return GENSON.serialize(assets);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String TransportWood(
            Context ctx,
            String id,
            String newOwner,
            String newLocation
    ) {
        Asset old = load(ctx, id);

        Asset updated = copy(
                old,
                newOwner,
                newLocation,
                TO_SAWMILL,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                old.getLogisticsToRetail(),
                old.getRetail(),
                old.getSawmill()
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String TransportToSawmill(
            Context ctx,
            String id,
            String logisticsOwner,
            String logisticsLocation
    ) {
        Asset old = load(ctx, id);
        requireStatus(old, HARVESTED);

        Asset updated = copy(
                old,
                logisticsOwner,
                logisticsLocation,
                TO_SAWMILL,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                old.getLogisticsToRetail(),
                old.getRetail(),
                old.getSawmill()
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String ProcessWood(
            Context ctx,
            String id,
            String newOwner,
            String newLocation
    ) {
        Asset old = load(ctx, id);
        requireStatus(old, TO_SAWMILL);

        Asset updated = copy(
                old,
                newOwner,
                newLocation,
                PROCESSED,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                old.getLogisticsToRetail(),
                old.getRetail(),
                ""
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String ProcessWoodWithRetailPlan(
            Context ctx,
            String id,
            String sawmillOwner,
            String sawmillLocation,
            String logisticsToRetail,
            String retail
    ) {
        Asset old = load(ctx, id);

        if (!TO_SAWMILL.equals(old.getStatus())
                && !PROCESSED.equals(old.getStatus())) {
            throw new ChaincodeException(
                    "Versandplanung ist bei Status "
                            + old.getStatus()
                            + " nicht möglich."
            );
        }

        validateRequired(logisticsToRetail, "Logistik zum Händler");
        validateRequired(retail, "Händler");

        Asset updated = copy(
                old,
                sawmillOwner,
                sawmillLocation,
                PROCESSED,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                logisticsToRetail,
                retail,
                retail
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String TransportToRetail(
            Context ctx,
            String id,
            String logisticsOwner,
            String logisticsLocation
    ) {
        Asset old = load(ctx, id);
        requireStatus(old, PROCESSED);
        validateRequired(old.getLogisticsToRetail(), "Logistik zum Händler");
        validateRequired(old.getRetail(), "Händler");

        Asset updated = copy(
                old,
                logisticsOwner,
                logisticsLocation,
                TO_RETAIL,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                old.getLogisticsToRetail(),
                old.getRetail(),
                old.getRetail()
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String SellWood(
            Context ctx,
            String id,
            String newOwner,
            String newLocation
    ) {
        Asset old = load(ctx, id);
        requireStatus(old, TO_RETAIL);

        Asset updated = copy(
                old,
                newOwner,
                newLocation,
                SOLD,
                old.getLogisticsToSawmill(),
                old.getSawmill(),
                old.getLogisticsToRetail(),
                old.getRetail(),
                ""
        );

        return save(ctx, updated);
    }

    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String GetWoodHistory(Context ctx, String id) {
        List<Map<String, Object>> history = new ArrayList<>();

        try (QueryResultsIterator<KeyModification> results =
                     ctx.getStub().getHistoryForKey(id)) {

            for (KeyModification modification : results) {
                Map<String, Object> entry = new LinkedHashMap<>();

                entry.put("txId", modification.getTxId());
                entry.put(
                        "timestamp",
                        modification.getTimestamp().toString()
                );
                entry.put("isDelete", modification.isDeleted());

                if (modification.isDeleted()
                        || modification.getStringValue() == null
                        || modification.getStringValue().isBlank()) {
                    entry.put("wood", null);
                } else {
                    entry.put(
                            "wood",
                            GENSON.deserialize(
                                    modification.getStringValue(),
                                    Asset.class
                            )
                    );
                }

                history.add(entry);
            }
        }

        return GENSON.serialize(history);
    }

    private Asset load(Context ctx, String id) {
        String json = ctx.getStub().getStringState(id);

        if (json == null || json.isBlank()) {
            throw new ChaincodeException(
                    "Holzcharge " + id + " wurde nicht gefunden."
            );
        }

        return GENSON.deserialize(json, Asset.class);
    }

    private String save(Context ctx, Asset asset) {
        String timestamp = ctx.getStub().getTxTimestamp().toString();

        if (asset.getHarvestDate() == null
                || asset.getHarvestDate().isBlank()) {
            asset.setHarvestDate(timestamp);
        }

        asset.setLastUpdate(timestamp);

        String json = GENSON.serialize(asset);
        ctx.getStub().putStringState(asset.getId(), json);

        return json;
    }

    private Asset copy(
            Asset old,
            String owner,
            String location,
            String status,
            String logisticsToSawmill,
            String sawmill,
            String logisticsToRetail,
            String retail,
            String targetLocation
    ) {
        return new Asset(
                old.getId(),
                old.getTreeType(),
                old.getVolumeM3(),
                old.getOrigin(),
                owner,
                location,
                status,
                logisticsToSawmill,
                sawmill,
                logisticsToRetail,
                retail,
                targetLocation
        );
    }

    private void ensureDoesNotExist(Context ctx, String id) {
        if (WoodExists(ctx, id)) {
            throw new ChaincodeException(
                    "Holzcharge " + id + " existiert bereits."
            );
        }
    }

    private void requireStatus(Asset asset, String expectedStatus) {
        if (!expectedStatus.equals(asset.getStatus())) {
            throw new ChaincodeException(
                    "Erwarteter Status: "
                            + expectedStatus
                            + ", aktueller Status: "
                            + asset.getStatus()
            );
        }
    }

    private void validateRequired(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ChaincodeException(
                    fieldName + " darf nicht leer sein."
            );
        }
    }
}
