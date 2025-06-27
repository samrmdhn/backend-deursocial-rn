import { generateDinamicBodyEmail, sendMail, templateHtmlCongratUploadMomen } from "../../libs/Mailist.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import { sendNotifChatGroup } from "../../libs/Scheduler.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import PostContentDetailModels from "../models/PostContentDetailModels.js";
import UsersModels from "../models/UsersModels.js";

export const changePostMoment = async (req, res) => {
    try {
        const slugPost = req.params.slug_post;
        const { post_id, accepted, username, event_id } = req.query;
        const getDataUsers = await UsersModels.findOne({
            where: {
                username: username,
            }
        });
        if (!getDataUsers) {
            return responseApi(res, [], null, "Username not found", 1);
        }

        await PostContentDetailModels.update(
            {
                is_accepted: accepted == "yes" ? 1 : 2

            },
            {
                where: {
                    slug: slugPost,
                    id: post_id,
                    users_id: getDataUsers.id
                }
            }
        );
        const event = await ContentDetailsModels.findOne({
            where: {
                id: event_id
            }
        })

        if (accepted == "yes") {
            await sendMail(getDataUsers.email, `Congrats! Momenmu di Event ${event.title} sudah tampil!`, templateHtmlCongratUploadMomen({ eventName: event.title, nameUser: getDataUsers.username, link: `https://deursocial.com/m/${slugPost}` }))
        }

        return responseApi(res, [], null, `Data has been ${accepted == "yes" ? "Accepted" : "Rejected"}`, 0);
    } catch (error) {
        console.log('error accept post moment', error)
        return responseApi(res, [], null, "Server error....", 1);
    }
}

export const reminderForUserManualSchedule = async (req, res) => {
    try {
        await sendNotifChatGroup()
        return responseApi(res, [], null, `Success send email`, 0);
    } catch (error) {
        console.log('error [reminderForUserManualSchedule]', error)
        return responseApi(res, [], null, "Server error....[no Success send email]", 1);
    }
}