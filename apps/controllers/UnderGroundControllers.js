import { convertToSlug, dateToEpochTime, makeRandomString, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import ContentDetailActressModels from "../models/ContentDetailActressModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import ContentDetailTagsModels from "../models/ContentDetailTagsModels.js";

export const postContentDetailOnUnderGround = withTransaction(async (req, res, transaction) => {
    try {
        const { data } = req.body;

        for (const event of data) {
            const actressArray = Array.isArray(event.actress) ? event.actress : [];
            const tagsArray = Array.isArray(event.tags) ? event.tags : [];

            console.log("event", event);

            let contentDetailData = await ContentDetailsModels.create(
                {
                    title: event.title,
                    slug: convertToSlug(event.title) + makeRandomString(3),
                    schedule_start: dateToEpochTime(event.schedule_start),
                    schedule_end: dateToEpochTime(event.schedule_end),
                    date_start: dateToEpochTime(event.date_start),
                    date_end: dateToEpochTime(event.date_end),
                    description: event.description,
                    image: event.image,
                    vanues_id: event.vanues_id,
                    contents_id: event.contents_id,
                    event_organizers_id: event.event_organizers_id,
                    is_trending: event.is_trending,
                    status: event.status,
                    type_content_details_id: event.type_content_details_id,
                    created_at: event.createdAt,
                },
                { transaction }
            );

            // Insert actress
            for (const valActress of actressArray) {
                await ContentDetailActressModels.create(
                    {
                        content_details_id: contentDetailData.id,
                        actress_id: valActress.id,
                    },
                    { transaction }
                );
            }

            // Insert tags
            for (const valTags of tagsArray) {
                await ContentDetailTagsModels.create(
                    {
                        content_details_id: contentDetailData.id,
                        tags_id: valTags.id,
                    },
                    { transaction }
                );
            }
        }

        return responseApi(res, {}, null, "Data has been saved", 1);
    } catch (error) {
        console.log("[error] postContentDetail", error);
        return responseApi(res, [], null, error, 1);
    }
});
