package org.hyperledger.fabric.samples.assettransfer;

import com.owlike.genson.annotation.JsonProperty;
import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;

@DataType
public final class Asset {

    @Property
    private final String id;

    @Property
    private final String treeType;

    @Property
    private final String volumeM3;

    @Property
    private final String origin;

    @Property
    private final String owner;

    @Property
    private final String location;

    @Property
    private final String status;

    @Property
    private final String logisticsToSawmill;

    @Property
    private final String sawmill;

    @Property
    private final String logisticsToRetail;

    @Property
    private final String retail;

    @Property
    private final String targetLocation;

    @Property
    private String harvestDate;

    @Property
    private String lastUpdate;

    public Asset(
            @JsonProperty("id") String id,
            @JsonProperty("treeType") String treeType,
            @JsonProperty("volumeM3") String volumeM3,
            @JsonProperty("origin") String origin,
            @JsonProperty("owner") String owner,
            @JsonProperty("location") String location,
            @JsonProperty("status") String status,
            @JsonProperty("logisticsToSawmill") String logisticsToSawmill,
            @JsonProperty("sawmill") String sawmill,
            @JsonProperty("logisticsToRetail") String logisticsToRetail,
            @JsonProperty("retail") String retail,
            @JsonProperty("targetLocation") String targetLocation
    ) {
        this.id = id;
        this.treeType = treeType;
        this.volumeM3 = volumeM3;
        this.origin = origin;
        this.owner = owner;
        this.location = location;
        this.status = status;
        this.logisticsToSawmill = logisticsToSawmill;
        this.sawmill = sawmill;
        this.logisticsToRetail = logisticsToRetail;
        this.retail = retail;
        this.targetLocation = targetLocation;
        this.harvestDate = "";
        this.lastUpdate = "";
    }

    public String getId() {
        return id;
    }

    public String getTreeType() {
        return treeType;
    }

    public String getVolumeM3() {
        return volumeM3;
    }

    public String getOrigin() {
        return origin;
    }

    public String getOwner() {
        return owner;
    }

    public String getLocation() {
        return location;
    }

    public String getStatus() {
        return status;
    }

    public String getLogisticsToSawmill() {
        return logisticsToSawmill;
    }

    public String getSawmill() {
        return sawmill;
    }

    public String getLogisticsToRetail() {
        return logisticsToRetail;
    }

    public String getRetail() {
        return retail;
    }

    public String getTargetLocation() {
        return targetLocation;
    }

    public String getHarvestDate() {
        return harvestDate;
    }

    public void setHarvestDate(String harvestDate) {
        this.harvestDate = harvestDate;
    }

    public String getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(String lastUpdate) {
        this.lastUpdate = lastUpdate;
    }
}
