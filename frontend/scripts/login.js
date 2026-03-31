document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".login-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            console.log("登录结果:", data);

            if (response.ok && data) {
                alert("登录成功");

                // 👉 保存用户信息（可选）
                localStorage.setItem("user", JSON.stringify(data));

                // Keep navigation relative to the current frontend directory
                window.location.href = "./dashboard.html";
            } else {
                alert("邮箱或密码错误");
            }

        } catch (err) {
            console.error("请求失败:", err);
            alert("服务器错误");
        }
    })
})
